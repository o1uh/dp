import sys
import json
import traceback  # ДОБАВЛЕНО
from pathlib import Path

# Добавляем пути репозитория для импорта модулей Demucs
sys.path.append("demucs")

try:
    from demucs.wav import Wavset
    
    metadata_path = Path("dataset/metadata.json")
    with open(metadata_path, "r") as f:
        metadata = json.load(f)
    
    samplerate = 44100
    segment_sec = 4
    shift_sec = 1
    
    # Инициализация датасета
    ds = Wavset(
        Path("dataset/train"), 
        metadata, 
        ["guitar", "other"], 
        samplerate=samplerate, 
        channels=2,
        segment=segment_sec * samplerate,
        shift=shift_sec * samplerate
    )
    print("=== ДИАГНОСТИКА ===")
    print("Итого сегментов для обучения (train split):", len(ds))
    
except Exception as e:
    print("=== ПОЛНЫЙ СТЕК ОШИБКИ ===")
    traceback.print_exc()  # ДОБАВЛЕНО: выведет точную строку и файл сбоя