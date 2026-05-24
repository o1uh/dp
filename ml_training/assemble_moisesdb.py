import os
import json
import numpy as np
import soundfile as sf
from pathlib import Path

# Конфигурация путей
MOISES_ROOT = Path("D:/moisesdb/moisesdb_v0.1")
DATASET_ROOT = Path(r"C:\Users\PC\Desktop\mx\labs\dddddddddddddd\dm\ml_training\dataset")
TARGET_SR = 44100

# Ограничение выборки (настроить перед запуском)
TRAIN_LIMIT = 90  # Количество треков для обучения
VALID_LIMIT = 10   # Количество треков для валидации

def load_and_pad(filepath):
    data, sr = sf.read(filepath)
    if sr != TARGET_SR:
        raise ValueError(f"Sample rate mismatch: {filepath}")
    if data.ndim == 1:
        data = np.expand_dims(data, axis=1)
        data = np.repeat(data, 2, axis=1)
    return data

def mix_paths(paths):
    mixed = None
    for p in paths:
        audio = load_and_pad(p)
        if mixed is None:
            mixed = audio
        else:
            length = max(len(mixed), len(audio))
            if len(mixed) < length:
                mixed = np.pad(mixed, ((0, length - len(mixed)), (0, 0)))
            if len(audio) < length:
                audio = np.pad(audio, ((0, length - len(audio)), (0, 0)))
            mixed += audio
    return mixed

def process_track(track_dir, stage):
    json_path = track_dir / "data.json"
    if not json_path.exists():
        return False

    with open(json_path, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    guitar_paths = []
    other_paths = []

    for stem in metadata.get("stems", []):
        stem_name = stem.get("stemName", "")
        for track in stem.get("tracks", []):
            track_file = track_dir / stem_name / f"{track['id']}.wav"
            if track_file.exists():
                if stem_name == "guitar":
                    guitar_paths.append(track_file)
                else:
                    other_paths.append(track_file)

    # Игнорируем треки без гитары
    if not guitar_paths:
        return False

    guitar_audio = mix_paths(guitar_paths)
    other_audio = mix_paths(other_paths)

    if guitar_audio is None:
        return False
    if other_audio is None:
        other_audio = np.zeros_like(guitar_audio)

    max_len = max(len(guitar_audio), len(other_audio))
    guitar_audio = np.pad(guitar_audio, ((0, max_len - len(guitar_audio)), (0, 0)))
    other_audio = np.pad(other_audio, ((0, max_len - len(other_audio)), (0, 0)))
    mixture_audio = guitar_audio + other_audio

    out_dir = DATASET_ROOT / stage / track_dir.name
    out_dir.mkdir(parents=True, exist_ok=True)
    
    sf.write(out_dir / "guitar.wav", guitar_audio, TARGET_SR)
    sf.write(out_dir / "other.wav", other_audio, TARGET_SR)
    sf.write(out_dir / "mixture.wav", mixture_audio, TARGET_SR)
    
    return True

if __name__ == "__main__":
    train_count = 0
    valid_count = 0
    
    track_dirs = [d for d in MOISES_ROOT.iterdir() if d.is_dir()]
    
    for t_dir in track_dirs:
        if train_count == TRAIN_LIMIT and valid_count == VALID_LIMIT:
            break
            
        stage = "train" if train_count < TRAIN_LIMIT else "valid"
        print(f"Обработка {t_dir.name} для {stage}...")
        
        success = process_track(t_dir, stage)
        
        if success:
            if stage == "train":
                train_count += 1
            else:
                valid_count += 1
                
    print(f"Готово. Train: {train_count}, Valid: {valid_count}")