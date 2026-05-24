import os
import wave
import struct
import math

def create_dummy_wav(path, duration=5, freq=440, sample_rate=44100):
    num_samples = duration * sample_rate
    with wave.open(path, 'w') as wav_file:
        # 2 канала (стерео), 2 байта на семпл (16-bit PCM), sample_rate
        wav_file.setparams((2, 2, sample_rate, num_samples, 'NONE', 'not compressed'))
        for i in range(num_samples):
            # Генерация синусоиды
            value = int(32767 * math.sin(2 * math.pi * freq * (i / sample_rate)))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data * 2) # дублируем на 2 канала

def build_structure():
    base_dir = "dataset"
    stages = ["train", "valid"]
    tracks = {
        "train": ["track_01", "track_02"],
        "valid": ["track_03"]
    }
    
    for stage in stages:
        for track in tracks[stage]:
            track_dir = os.path.join(base_dir, stage, track)
            os.makedirs(track_dir, exist_ok=True)
            
            # Создаем mixture, guitar и other (везде разная частота звука)
            create_dummy_wav(os.path.join(track_dir, "mixture.wav"), duration=10, freq=220)
            create_dummy_wav(os.path.join(track_dir, "guitar.wav"), duration=10, freq=440)
            create_dummy_wav(os.path.join(track_dir, "other.wav"), duration=10, freq=880)
            print(f"Создан тестовый трек: {track_dir}")

if __name__ == "__main__":
    build_structure()