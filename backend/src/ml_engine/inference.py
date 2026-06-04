import torch
from pathlib import Path
from src.ml_engine.core import demucs_engine
from src.ml_engine.io import load_audio, save_audio
from src.ml_engine.optimizer import apply_inference_optimized
from src.core.logger import logger

STEM_CLASSES_4 = ["drums", "bass", "other", "vocals"]

def separate_track(input_path: Path, output_dir: Path, model_type: str = "htdemucs") -> dict:
    logger.info(f"Starting neural separation pipeline. Source File: {input_path}, Model: {model_type}")

    # logger.info("Requesting basic HTDemucs model allocation...")
    model_4 = demucs_engine.load_4_stems_model()
    sample_rate = model_4.samplerate
    # logger.info(f"HTDemucs model successfully assigned. Working sample rate: {sample_rate}Hz")

    # logger.info("Loading target audio track file onto memory matrix tensor...")
    audio_tensor = load_audio(input_path, sample_rate)
    # logger.info(f"Track matrix loaded onto memory. Tensor dimension properties: {audio_tensor.shape}")

    logger.info("Running 4-stem inference...")
    sources_4 = apply_inference_optimized(model_4, audio_tensor, shifts=1)
    # logger.info("Standard inference calculations completed successfully.")

    drums_tensor = sources_4[0]
    bass_tensor = sources_4[1]
    other_standard_tensor = sources_4[2]
    vocals_tensor = sources_4[3]
    # logger.info("Matrix channels correctly mapped to standard classes: drums, bass, other, vocals.")

    # logger.info("Deallocating base HTDemucs model parameters to preserve VRAM limits...")
    demucs_engine.unload_4_stems_model()

    results = {}

    if model_type == "cascade_guitar":
        logger.info("Cascade guitar mode: loading guitar model and extracting guitar/other_clean stems...")
        model_guitar = demucs_engine.load_guitar_model()

        # logger.info("Running optimized inference calculations for guitar stem...")
        sources_guitar = apply_inference_optimized(model_guitar, audio_tensor, shifts=1)
        guitar_tensor = sources_guitar[2]

        # logger.info("Deallocating PyTorch guitar model weights parameters...")
        demucs_engine.unload_guitar_model()

        # logger.info("Executing algebraic matrix subtraction to subtract guitar signal from 'other' signals group...")
        other_clean_tensor = other_standard_tensor - guitar_tensor

        # logger.info("Calculating maximum peak amplitude normalization boundaries...")
        max_val = torch.max(torch.abs(other_clean_tensor))
        # logger.info(f"Maximum absolute value registered: {max_val}")
        if max_val > 1.0:
            # logger.info("Peak value exceeds digital clipping boundaries. Scaling other_clean amplitude down...")
            other_clean_tensor = other_clean_tensor / max_val
            # logger.info("Amplitude matrix normalization complete.")
            pass

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

    # logger.info(f"Starting wave file encoding tasks on target directories. Target classes output: {target_classes}")
    for stem_name in target_classes:
        stem_tensor = stems_mapping[stem_name]
        flac_path = output_dir / f"{stem_name}.flac"
        mp3_path = output_dir / f"{stem_name}.mp3"

        # logger.info(f"Encoding '{stem_name}' tensor values. Writing to FLAC: {flac_path}...")
        save_audio(stem_tensor, flac_path, sample_rate, format='flac')

        # logger.info(f"Encoding '{stem_name}' tensor values. Writing to MP3: {mp3_path}...")
        save_audio(stem_tensor, mp3_path, sample_rate, format='mp3')

        results[stem_name] = {
            "flac": str(flac_path),
            "mp3": str(mp3_path),
            "size_flac": flac_path.stat().st_size,
            "size_mp3": mp3_path.stat().st_size
        }
        # logger.info(f"Files written. Size metrics - FLAC: {results[stem_name]['size_flac']} bytes, MP3: {results[stem_name]['size_mp3']} bytes.")

    logger.info(f"Neural separation finalized. Produced {len(results)} stems.")
    return results