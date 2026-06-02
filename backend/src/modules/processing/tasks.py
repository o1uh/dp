import os
import shutil
import tempfile
import requests
import logging
import ffmpeg
import zipfile
import time
import redis
import torch
from pathlib import Path
from src.core.worker.celery_app import celery_app
from src.ml_engine.s3_sync import download_file, upload_file
from src.ml_engine.inference import separate_track
from src.ml_engine.core import demucs_engine
from src.ml_engine.io import load_audio, save_audio
from src.ml_engine.optimizer import apply_inference_optimized
from src.core.config import settings
from src.core.logger import logger

BUCKET_NAME = "audio-platform-uploads"
WEBHOOK_URL = "http://api:8000/api/processing/webhooks"

def _send_webhook(payload: dict):
    logger.info(f"Dispatching worker status webhook event payload. URL: {WEBHOOK_URL}, Task ID: {payload.get('task_id')}, Status: {payload.get('status')}")
    headers = {"X-Internal-Token": settings.INTERNAL_WEBHOOK_TOKEN}
    try:
        response = requests.post(WEBHOOK_URL, json=payload, headers=headers, timeout=10)
        logger.info(f"Webhook response received from server endpoint. Status Code: {response.status_code}")
        response.raise_for_status() 
    except requests.RequestException as e:
        error_msg = response.text if 'response' in locals() and response else str(e)
        logger.error(f"Failed to send webhook for task {payload.get('task_id')}. API Response: {error_msg}")
        raise

@celery_app.task(bind=True, name="process_audio", acks_late=True)
def process_audio(self, task_id: str, s3_key_original: str, file_id: str, model_config: dict = None):
    logger.info(f"Celery process_audio task started. Worker Task ID: {self.request.id}, DB Task ID: {task_id}, File: {file_id}")
    
    model_config = model_config or {}
    parent_task_id = model_config.get("parent_task_id")

    is_mock_mode = model_config.get("is_mock_mode", False)

    if not is_mock_mode:
        env_mock = os.getenv("MOCK_ML_PROCESSING", "False").lower() in ("true", "1", "yes")
        redis_mock = False
        try:
            r_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            val = r_client.get("MOCK_ML_PROCESSING")
            if isinstance(val, bytes):
                val = val.decode("utf-8")
            redis_mock = (val == "True")
        except Exception as re:
            logger.warning(f"[WORKER] Failed to fetch mock mode from Redis: {re}. Falling back to False.")
            redis_mock = False
        is_mock_mode = env_mock or redis_mock

    logger.info(f"[WORKER] Final mock mode state for Task ID {task_id}: {is_mock_mode}")

    logger.info(f"Sending processing start webhook events for task: {task_id}")
    _send_webhook({
        "task_id": task_id,
        "file_id": file_id,
        "status": "processing",
        "stems": []
    })
    
    if parent_task_id:
        logger.info(f"Sending processing start webhook events for parent task: {parent_task_id}")
        _send_webhook({
            "task_id": parent_task_id,
            "file_id": file_id,
            "status": "processing",
            "stems": []
        })

    logger.info("Constructing temporary filesystem sandbox directories...")
    temp_dir = Path(tempfile.mkdtemp())
    input_file = temp_dir / "input.audio"
    logger.info(f"Sandbox generated path: {temp_dir}")
    
    payload = {
        "task_id": task_id,
        "file_id": file_id,
        "status": "completed",
        "error_message": None,
        "stems": []
    }

    try:
        model_type = model_config.get("model", "htdemucs")
        cached_stems = model_config.get("cached_stems", None)

        if is_mock_mode:
            # =================================================================
            # test
            # =================================================================
            logger.info("[MOCK MODE] Запущена симуляция разделения аудио...")
            time.sleep(1.0) 

            if model_type == "cascade_guitar":
                target_classes = ["drums", "bass", "other", "other_clean", "vocals", "guitar"]
            else:
                target_classes = ["drums", "bass", "other", "vocals"]

            base_s3_path = f"stems/{file_id}/{task_id}"

            for stem_class in target_classes:
                flac_path = temp_dir / f"{stem_class}.flac"
                mp3_path = temp_dir / f"{stem_class}.mp3"

                flac_path.write_bytes(b"\x00")
                mp3_path.write_bytes(b"\x00")

                s3_key_flac = f"{base_s3_path}/{stem_class}.flac"
                s3_key_mp3 = f"{base_s3_path}/{stem_class}.mp3"

                logger.info(f"[MOCK] Загрузка заглушки '{stem_class}' в S3...")
                upload_file(BUCKET_NAME, flac_path, s3_key_flac, "audio/flac")
                upload_file(BUCKET_NAME, mp3_path, s3_key_mp3, "audio/mpeg")

                if parent_task_id:
                    if stem_class == "other_clean":
                        db_stem_class = "other"
                        target_task = task_id
                        model_ver = "HT_Demucs_v4_Cascade"
                    elif stem_class == "guitar":
                        db_stem_class = "guitar"
                        target_task = task_id
                        model_ver = "HT_Demucs_v4_Cascade"
                    else:
                        db_stem_class = stem_class
                        target_task = parent_task_id
                        model_ver = "HT_Demucs_v4"
                else:
                    db_stem_class = stem_class
                    target_task = task_id
                    model_ver = "HT_Demucs_v4_Cascade" if model_type == "cascade_guitar" else "HT_Demucs_v4"

                payload["stems"].append({
                    "stem_class": db_stem_class,
                    "s3_key_flac": s3_key_flac,
                    "s3_key_mp3": s3_key_mp3,
                    "file_size_bytes": 1,
                    "model_version": model_ver,
                    "task_id": target_task
                })
        else:
            # =================================================================
            # real
            # =================================================================
            logger.info(f"Downloading original media from S3 bucket '{BUCKET_NAME}' key '{s3_key_original}' onto sandbox path '{input_file}'...")
            download_file(BUCKET_NAME, s3_key_original, input_file)
            logger.info("File successfully download complete.")

            if model_type == "cascade_guitar" and cached_stems:
                logger.info("Sequential processing cached cascade track separation activated.")
                other_dirty_s3_key = cached_stems["other"]["s3_key_flac"]
                other_dirty_local = temp_dir / "other_dirty.flac"
                
                logger.info(f"Downloading dirty 'other' stem components from S3 key '{other_dirty_s3_key}'...")
                download_file(BUCKET_NAME, other_dirty_s3_key, other_dirty_local)
                logger.info("Dirty other stem download complete.")

                logger.info("Requesting PyTorch guitar weights parameters allocation...")
                model_guitar = demucs_engine.load_guitar_model()
                sample_rate = model_guitar.samplerate

                logger.info("Loading original audio wave properties into CPU memory arrays...")
                audio_tensor = load_audio(input_file, sample_rate)
                
                logger.info("Executing neural model inference to capture guitar signals...")
                sources_guitar = apply_inference_optimized(model_guitar, audio_tensor, shifts=1)
                guitar_tensor = sources_guitar[2]
                
                logger.info("Unloading custom PyTorch guitar model to preserve system assets...")
                demucs_engine.unload_guitar_model()

                logger.info("Loading dirty 'other' wave parameters into CPU memory arrays...")
                other_dirty_tensor = load_audio(other_dirty_local, sample_rate)
                
                logger.info("Evaluating matrix bounds and aligning timeline length properties...")
                min_samples = min(other_dirty_tensor.shape[-1], guitar_tensor.shape[-1])
                logger.info(f"Aligned output sample count bounds: {min_samples}")
                
                other_dirty_tensor_aligned = other_dirty_tensor[..., :min_samples]
                guitar_tensor_aligned = guitar_tensor[..., :min_samples]
                
                logger.info("Performing signal cancellation subtraction logic (other_dirty - guitar)...")
                other_clean_tensor = other_dirty_tensor_aligned - guitar_tensor_aligned

                logger.info("Normalizing amplitude peaks to prevent digital wave distortion...")
                max_val = torch.max(torch.abs(other_clean_tensor))
                logger.info(f"Peak absolute value registered: {max_val}")
                if max_val > 1.0:
                    logger.info("Scaling other_clean signals values down...")
                    other_clean_tensor = other_clean_tensor / max_val

                stems_to_upload = {
                    "guitar": guitar_tensor_aligned,
                    "other": other_clean_tensor
                }

                base_s3_path = f"stems/{file_id}/{task_id}"
                
                logger.info("Encoding and uploading resulting clean signal matrices on S3...")
                for stem_class, tensor in stems_to_upload.items():
                    flac_path = temp_dir / f"{stem_class}.flac"
                    mp3_path = temp_dir / f"{stem_class}.mp3"
                    
                    logger.info(f"Encoding '{stem_class}' output streams onto wave files...")
                    save_audio(tensor, flac_path, sample_rate, format='flac')
                    save_audio(tensor, mp3_path, sample_rate, format='mp3')

                    s3_key_flac = f"{base_s3_path}/{stem_class}.flac"
                    s3_key_mp3 = f"{base_s3_path}/{stem_class}.mp3"

                    logger.info(f"Uploading FLAC stream of '{stem_class}' class to key: {s3_key_flac}")
                    upload_file(BUCKET_NAME, flac_path, s3_key_flac, "audio/flac")
                    logger.info(f"Uploading MP3 stream of '{stem_class}' class to key: {s3_key_mp3}")
                    upload_file(BUCKET_NAME, mp3_path, s3_key_mp3, "audio/mpeg")

                    payload["stems"].append({
                        "stem_class": stem_class,
                        "s3_key_flac": s3_key_flac,
                        "s3_key_mp3": s3_key_mp3,
                        "file_size_bytes": flac_path.stat().st_size + mp3_path.stat().st_size,
                        "model_version": "HT_Demucs_v4_Guitar_Only",
                        "task_id": task_id
                    })

            else:
                logger.info(f"Executing standard parallel track separation algorithm using model: {model_type}")
                results = separate_track(input_file, temp_dir, model_type)
                base_s3_path = f"stems/{file_id}/{task_id}"
                
                logger.info("Uploading resulting separated stems class matrices to S3 storage bucket...")
                for stem_class, data in results.items():
                    s3_key_flac = f"{base_s3_path}/{stem_class}.flac"
                    s3_key_mp3 = f"{base_s3_path}/{stem_class}.mp3"
                    
                    logger.info(f"Uploading FLAC of '{stem_class}' class to S3 key: {s3_key_flac}")
                    upload_file(BUCKET_NAME, Path(data["flac"]), s3_key_flac, "audio/flac")
                    
                    logger.info(f"Uploading MP3 of '{stem_class}' class to S3 key: {s3_key_mp3}")
                    upload_file(BUCKET_NAME, Path(data["mp3"]), s3_key_mp3, "audio/mpeg")
                    
                    if parent_task_id:
                        if stem_class == "other_clean":
                            db_stem_class = "other"
                            target_task = task_id
                            model_ver = "HT_Demucs_v4_Cascade"
                        elif stem_class == "guitar":
                            db_stem_class = "guitar"
                            target_task = task_id
                            model_ver = "HT_Demucs_v4_Cascade"
                        else:
                            db_stem_class = stem_class
                            target_task = parent_task_id
                            model_ver = "HT_Demucs_v4"
                    else:
                        db_stem_class = stem_class
                        target_task = task_id
                        model_ver = "HT_Demucs_v4_Cascade" if model_type == "cascade_guitar" else "HT_Demucs_v4"

                    payload["stems"].append({
                        "stem_class": db_stem_class,
                        "s3_key_flac": s3_key_flac,
                        "s3_key_mp3": s3_key_mp3,
                        "file_size_bytes": data["size_flac"] + data["size_mp3"],
                        "model_version": model_ver,
                        "task_id": target_task
                    })

    except Exception as e:
        logger.error(f"Inference run failed with error trace: {e}", exc_info=True)
        payload["status"] = "failed"
        payload["error_message"] = str(e)
        if parent_task_id:
            logger.info("Reporting parent task failure via status update webhook...")
            _send_webhook({
                "task_id": parent_task_id,
                "file_id": file_id,
                "status": "failed",
                "error_message": str(e),
                "stems": []
            })
        raise
    finally:
        logger.info("Cleaning up temporary local file system directories sandbox...")
        shutil.rmtree(temp_dir, ignore_errors=True)
        logger.info("Temporary sandbox directory wiped. Dispatching task state webhook...")
        _send_webhook(payload)
        logger.info("Task lifecycle finalized in worker process.")


@celery_app.task(bind=True, name="render_session", acks_late=True)
def render_session(self, task_id: str, track_configs: list, file_id: str, model_config: dict = None):
    logger.info(f"Celery render_session task started. DB Task ID: {task_id}, Config entries count: {len(track_configs)}")
    
    model_config = model_config or {}
    is_mock_mode = model_config.get("is_mock_mode", False)

    if not is_mock_mode:
        env_mock = os.getenv("MOCK_ML_PROCESSING", "False").lower() in ("true", "1", "yes")
        try:
            r_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            val = r_client.get("MOCK_ML_PROCESSING")
            redis_mock = (val == "True") if val else False
        except Exception:
            redis_mock = False
        is_mock_mode = env_mock or redis_mock

    _send_webhook({
        "task_id": task_id,
        "file_id": file_id,
        "status": "processing",
        "stems": []
    })

    logger.info("Generating sandbox folders for ZIP archive package compilation...")
    temp_dir = Path(tempfile.mkdtemp())
    output_file = temp_dir / "stems.zip"
    
    payload = {
        "task_id": task_id,
        "file_id": file_id,
        "status": "completed",
        "error_message": None,
        "stems": []
    }

    try:
        s3_key_zip = f"renders/{file_id}/stems.zip"

        if is_mock_mode:
            logger.info("[MOCK MODE] Запущена симуляция рендера сессии...")
            time.sleep(1.0)
            output_file.write_bytes(b"\x00\x00\x00\x00")
            
            logger.info(f"Uploading compiled archive file package to key: {s3_key_zip}")
            upload_file(BUCKET_NAME, output_file, s3_key_zip, "application/zip")
            
            payload["stems"].append({
                "stem_class": "stems_archive",
                "s3_key_flac": s3_key_zip,
                "s3_key_mp3": s3_key_zip,
                "file_size_bytes": 4,
                "model_version": "zip_package"
            })
            logger.info("ZIP package compression pipeline successfully completed.")
        else:
            logger.info(f"Compiling ZIP compression package output stream onto target path: {output_file}")
            with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for idx, config in enumerate(track_configs):
                    s3_key = config["s3_key"]
                    ext = Path(s3_key).suffix or ".audio"
                    local_path = temp_dir / f"track_{idx}{ext}"
                    
                    logger.info(f"Downloading track index {idx} from key '{s3_key}'...")
                    download_file(BUCKET_NAME, s3_key, local_path)
                    
                    stem_name = Path(s3_key).stem or f"track_{idx}"
                    logger.info(f"Packing file '{stem_name}{ext}' into archive compilation...")
                    zipf.write(local_path, arcname=f"{stem_name}{ext}")

            logger.info(f"Uploading compiled archive file package to key: {s3_key_zip}")
            upload_file(BUCKET_NAME, output_file, s3_key_zip, "application/zip")
            
            payload["stems"].append({
                "stem_class": "stems_archive",
                "s3_key_flac": s3_key_zip,
                "s3_key_mp3": s3_key_zip,
                "file_size_bytes": output_file.stat().st_size,
                "model_version": "zip_package"
            })
            logger.info("ZIP package compression pipeline successfully completed.")

    except Exception as e:
        logger.error(f"Render engine task failed with error trace: {e}", exc_info=True)
        payload["status"] = "failed"
        payload["error_message"] = str(e)
        raise
    finally:
        logger.info("Cleaning up temporary workspace files...")
        shutil.rmtree(temp_dir, ignore_errors=True)
        logger.info("Temporary workspace wiped. Dispatching webhook state...")
        _send_webhook(payload)
        logger.info("Render lifecycle finalized in worker process.")