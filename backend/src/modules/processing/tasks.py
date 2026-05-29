import os
import shutil
import tempfile
import requests
import logging
import ffmpeg
import zipfile
import torch
from pathlib import Path
from src.core.worker.celery_app import celery_app
from src.ml_engine.s3_sync import download_file, upload_file
from src.ml_engine.inference import separate_track
from src.ml_engine.core import demucs_engine
from src.ml_engine.io import load_audio, save_audio
from src.ml_engine.optimizer import apply_inference_optimized
from src.core.config import settings

BUCKET_NAME = "audio-platform-uploads"
WEBHOOK_URL = "http://api:8000/api/processing/webhooks"

def _send_webhook(payload: dict):
    headers = {"X-Internal-Token": settings.INTERNAL_WEBHOOK_TOKEN}
    try:
        response = requests.post(WEBHOOK_URL, json=payload, headers=headers, timeout=10)
        response.raise_for_status() 
    except requests.RequestException as e:
        error_msg = response.text if 'response' in locals() and response else str(e)
        logging.error(f"Failed to send webhook for task {payload.get('task_id')}. API Response: {error_msg}")
        raise

@celery_app.task(bind=True, name="process_audio", acks_late=True)
def process_audio(self, task_id: str, s3_key_original: str, file_id: str, model_config: dict = None):
    print(f"[WORKER] process_audio task received. task_id={task_id}, file_id={file_id}, model_config={model_config}", flush=True)
    
    model_config = model_config or {}
    parent_task_id = model_config.get("parent_task_id")

    _send_webhook({
        "task_id": task_id,
        "file_id": file_id,
        "status": "processing",
        "stems": []
    })
    
    if parent_task_id:
        _send_webhook({
            "task_id": parent_task_id,
            "file_id": file_id,
            "status": "processing",
            "stems": []
        })

    temp_dir = Path(tempfile.mkdtemp())
    input_file = temp_dir / "input.audio"
    
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

        logging.info(f"Executing task {task_id}: model={model_type}, has_cache={cached_stems is not None}")
        download_file(BUCKET_NAME, s3_key_original, input_file)

        if model_type == "cascade_guitar" and cached_stems:
            other_dirty_s3_key = cached_stems["other"]["s3_key_flac"]
            other_dirty_local = temp_dir / "other_dirty.flac"
            download_file(BUCKET_NAME, other_dirty_s3_key, other_dirty_local)

            model_guitar = demucs_engine.load_guitar_model()
            sample_rate = model_guitar.samplerate

            audio_tensor = load_audio(input_file, sample_rate)
            sources_guitar = apply_inference_optimized(model_guitar, audio_tensor, shifts=1)
            guitar_tensor = sources_guitar[2]
            demucs_engine.unload_guitar_model()

            other_dirty_tensor = load_audio(other_dirty_local, sample_rate)
            
            min_samples = min(other_dirty_tensor.shape[-1], guitar_tensor.shape[-1])
            other_dirty_tensor_aligned = other_dirty_tensor[..., :min_samples]
            guitar_tensor_aligned = guitar_tensor[..., :min_samples]
            
            other_clean_tensor = other_dirty_tensor_aligned - guitar_tensor_aligned

            max_val = torch.max(torch.abs(other_clean_tensor))
            if max_val > 1.0:
                other_clean_tensor = other_clean_tensor / max_val

            stems_to_upload = {
                "guitar": guitar_tensor_aligned,
                "other": other_clean_tensor
            }

            base_s3_path = f"stems/{file_id}/{task_id}"
            
            for stem_class, tensor in stems_to_upload.items():
                flac_path = temp_dir / f"{stem_class}.flac"
                mp3_path = temp_dir / f"{stem_class}.mp3"
                
                save_audio(tensor, flac_path, sample_rate, format='flac')
                save_audio(tensor, mp3_path, sample_rate, format='mp3')

                s3_key_flac = f"{base_s3_path}/{stem_class}.flac"
                s3_key_mp3 = f"{base_s3_path}/{stem_class}.mp3"

                upload_file(BUCKET_NAME, flac_path, s3_key_flac, "audio/flac")
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
            results = separate_track(input_file, temp_dir, model_type)
            base_s3_path = f"stems/{file_id}/{task_id}"
            
            for stem_class, data in results.items():
                s3_key_flac = f"{base_s3_path}/{stem_class}.flac"
                s3_key_mp3 = f"{base_s3_path}/{stem_class}.mp3"
                
                upload_file(BUCKET_NAME, Path(data["flac"]), s3_key_flac, "audio/flac")
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
        payload["status"] = "failed"
        payload["error_message"] = str(e)
        if parent_task_id:
            _send_webhook({
                "task_id": parent_task_id,
                "file_id": file_id,
                "status": "failed",
                "error_message": str(e),
                "stems": []
            })
        logging.error(f"Task {task_id} failed: {e}")
        raise
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        _send_webhook(payload)


@celery_app.task(bind=True, name="render_session", acks_late=True)
def render_session(self, task_id: str, track_configs: list, file_id: str):
    _send_webhook({
        "task_id": task_id,
        "file_id": file_id,
        "status": "processing",
        "stems": []
    })

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
        with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for idx, config in enumerate(track_configs):
                ext = Path(config["s3_key"]).suffix or ".audio"
                local_path = temp_dir / f"track_{idx}{ext}"
                
                download_file(BUCKET_NAME, config["s3_key"], local_path)
                
                stem_name = Path(config["s3_key"]).stem or f"track_{idx}"
                zipf.write(local_path, arcname=f"{stem_name}{ext}")

        s3_key_zip = f"renders/{file_id}/stems.zip"
        upload_file(BUCKET_NAME, output_file, s3_key_zip, "application/zip")
        
        payload["stems"].append({
            "stem_class": "stems_archive",
            "s3_key_flac": s3_key_zip,
            "s3_key_mp3": s3_key_zip,
            "file_size_bytes": output_file.stat().st_size,
            "model_version": "zip_package"
        })

    except Exception as e:
        payload["status"] = "failed"
        payload["error_message"] = str(e)
        logging.error(f"Render task {task_id} failed: {e}")
        raise
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        _send_webhook(payload)