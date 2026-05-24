import os
import shutil
import tempfile
import requests
import logging
import ffmpeg
from pathlib import Path
from src.core.worker.celery_app import celery_app
from src.ml_engine.s3_sync import download_file, upload_file
from src.ml_engine.inference import separate_track
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
def process_audio(self, task_id: str, s3_key_original: str, file_id: str):
    _send_webhook({
        "task_id": task_id,
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
        download_file(BUCKET_NAME, s3_key_original, input_file)
        results = separate_track(input_file, temp_dir)
        base_s3_path = f"stems/{file_id}/{task_id}"
        
        for stem_class, data in results.items():
            s3_key_flac = f"{base_s3_path}/{stem_class}.flac"
            s3_key_mp3 = f"{base_s3_path}/{stem_class}.mp3"
            
            upload_file(BUCKET_NAME, Path(data["flac"]), s3_key_flac, "audio/flac")
            upload_file(BUCKET_NAME, Path(data["mp3"]), s3_key_mp3, "audio/mpeg")
            
            payload["stems"].append({
                "stem_class": stem_class,
                "s3_key_flac": s3_key_flac,
                "s3_key_mp3": s3_key_mp3,
                "file_size_bytes": data["size_flac"] + data["size_mp3"],
                "model_version": "HT_Demucs_v4"
            })

    except Exception as e:
        payload["status"] = "failed"
        payload["error_message"] = str(e)
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
    output_file = temp_dir / "mix.flac"
    
    payload = {
        "task_id": task_id,
        "file_id": file_id,
        "status": "completed",
        "error_message": None,
        "stems": []
    }

    try:
        inputs = []
        for idx, config in enumerate(track_configs):
            ext = Path(config["s3_key"]).suffix or ".audio"
            local_path = temp_dir / f"track_{idx}{ext}"
            
            download_file(BUCKET_NAME, config["s3_key"], local_path)
            
            stream = ffmpeg.input(str(local_path))
            
            if config.get("trim_start_ms", 0) > 0 or config.get("trim_end_ms"):
                start_s = config.get("trim_start_ms", 0) / 1000.0
                end_kwargs = {}
                if config.get("trim_end_ms"):
                    end_kwargs["end"] = config["trim_end_ms"] / 1000.0
                stream = stream.filter('atrim', start=start_s, **end_kwargs).filter('asetpts', 'PTS-STARTPTS')

            delay_ms = config.get("start_offset_ms", 0)
            volume = config.get("volume", 1.0)
            
            stream = stream.filter('adelay', f'{delay_ms}|{delay_ms}').filter('volume', volume=volume)
            inputs.append(stream)

        if not inputs:
            raise ValueError("No tracks to mix")

        merged = ffmpeg.filter(inputs, 'amix', inputs=len(inputs), duration='longest')
        
        (
            ffmpeg
            .output(merged, str(output_file), format='flac')
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )

        s3_key_flac = f"renders/{file_id}/mix.flac"
        upload_file(BUCKET_NAME, output_file, s3_key_flac, "audio/flac")
        
        payload["stems"].append({
            "stem_class": "mix",
            "s3_key_flac": s3_key_flac,
            "s3_key_mp3": s3_key_flac,
            "file_size_bytes": output_file.stat().st_size,
            "model_version": "ffmpeg_mix"
        })

    except ffmpeg.Error as e:
        payload["status"] = "failed"
        payload["error_message"] = f"FFmpeg error: {e.stderr.decode()}"
        logging.error(f"Render task {task_id} failed: {payload['error_message']}")
        raise
    except Exception as e:
        payload["status"] = "failed"
        payload["error_message"] = str(e)
        logging.error(f"Render task {task_id} failed: {e}")
        raise
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        _send_webhook(payload)