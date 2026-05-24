import os
import json
import wave

def get_wav_info(path):
    with wave.open(path, 'rb') as f:
        return f.getnframes(), f.getframerate()

def generate_demucs_manifest():
    dataset_dir = "dataset"
    
    # Структура для раздельного хранения train и valid метаданных
    manifests = {
        "train": {},
        "valid": {}
    }
    
    for stage in ["train", "valid"]:
        stage_dir = os.path.join(dataset_dir, stage)
        if not os.path.exists(stage_dir):
            continue
        for track_name in os.listdir(stage_dir):
            track_dir = os.path.join(stage_dir, track_name)
            if os.path.isdir(track_dir):
                # Считываем mixture.wav для получения длины и частоты
                mix_path = os.path.join(track_dir, "mixture.wav")
                if os.path.exists(mix_path):
                    try:
                        samples, samplerate = get_wav_info(mix_path)
                        # Записываем структуру со всеми полями, которые ожидает Solver Demucs
                        manifests[stage][track_name] = {
                            "length": samples,
                            "mean": 0.0,
                            "std": 1.0,
                            "samplerate": samplerate
                        }
                        print(f"Индексирован [{stage}] трек: {track_name} ({samples} семплов, {samplerate} Гц)")
                    except Exception as e:
                        print(f"Ошибка чтения файла {mix_path}: {e}")

    # Склеиваем метаданные в массив из двух словарей [train, valid]
    payload = [manifests["train"], manifests["valid"]]

    # Записываем напрямую в целевой файл кэша Demucs
    out_path = os.path.join(dataset_dir, "wav_6d0b3bf9.json")
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"\nСпециальный кэш-манифест успешно сохранен в: {out_path}")

if __name__ == "__main__":
    generate_demucs_manifest()