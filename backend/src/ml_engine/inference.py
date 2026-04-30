import torch
from pathlib import Path
from src.ml_engine.core import demucs_engine
from src.ml_engine.io import load_audio, save_audio
from src.ml_engine.optimizer import apply_inference_optimized

# порядок выходов htdemucs по умолчанию: drums, bass, other, vocals
STEM_CLASSES = ["drums", "bass", "other", "vocals"]

def separate_track(input_path: Path, output_dir: Path) -> dict:
    model = demucs_engine.get_model()
    sample_rate = model.samplerate

    audio_tensor = load_audio(input_path, sample_rate)
    
    sources = apply_inference_optimized(model, audio_tensor, shifts=1)
    
    results = {}
    for idx, stem_name in enumerate(STEM_CLASSES):
        stem_tensor = sources[idx]
        
        flac_path = output_dir / f"{stem_name}.flac"
        mp3_path = output_dir / f"{stem_name}.mp3"
        
        save_audio(stem_tensor, flac_path, sample_rate, format='flac')
        save_audio(stem_tensor, mp3_path, sample_rate, format='mp3')
        
        results[stem_name] = {
            "flac": str(flac_path),
            "mp3": str(mp3_path),
            "size_flac": flac_path.stat().st_size,
            "size_mp3": mp3_path.stat().st_size
        }
        
    return results