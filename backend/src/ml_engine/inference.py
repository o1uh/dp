import torch
from pathlib import Path
from src.ml_engine.core import demucs_engine
from src.ml_engine.io import load_audio, save_audio
from src.ml_engine.optimizer import apply_inference_optimized

STEM_CLASSES_4 = ["drums", "bass", "other", "vocals"]

def separate_track(input_path: Path, output_dir: Path, model_type: str = "htdemucs") -> dict:
    model_4 = demucs_engine.load_4_stems_model()
    sample_rate = model_4.samplerate

    audio_tensor = load_audio(input_path, sample_rate)
    sources_4 = apply_inference_optimized(model_4, audio_tensor, shifts=1)
    
    drums_tensor = sources_4[0]
    bass_tensor = sources_4[1]
    other_standard_tensor = sources_4[2]
    vocals_tensor = sources_4[3]

    demucs_engine.unload_4_stems_model()

    results = {}

    if model_type == "cascade_guitar":
        model_guitar = demucs_engine.load_guitar_model()
        sources_guitar = apply_inference_optimized(model_guitar, audio_tensor, shifts=1)
        guitar_tensor = sources_guitar[2]
        demucs_engine.unload_guitar_model()

        other_clean_tensor = other_standard_tensor - guitar_tensor
        max_val = torch.max(torch.abs(other_clean_tensor))
        if max_val > 1.0:
            other_clean_tensor = other_clean_tensor / max_val

        stems_mapping = {
            "drums": drums_tensor,
            "bass": bass_tensor,
            "other": other_standard_tensor,
            "other_clean": other_clean_tensor,
            "vocals": vocals_tensor,
            "guitar": guitar_tensor
        }
        target_classes = ["drums", "bass", "other", "other_clean", "vocals", "guitar"]
    else:
        stems_mapping = {
            "drums": drums_tensor,
            "bass": bass_tensor,
            "other": other_standard_tensor,
            "vocals": vocals_tensor
        }
        target_classes = STEM_CLASSES_4

    for stem_name in target_classes:
        stem_tensor = stems_mapping[stem_name]
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