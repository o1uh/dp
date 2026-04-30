import ffmpeg
import numpy as np
import torch
from pathlib import Path

def load_audio(file_path: Path, sample_rate: int = 44100) -> torch.Tensor:
    try:
        out, _ = (
            ffmpeg.input(str(file_path))
            .output('pipe:', format='f32le', acodec='pcm_f32le', ac=2, ar=sample_rate)
            .run(capture_stdout=True, capture_stderr=True)
        )
    except ffmpeg.Error as e:
        raise RuntimeError(f"Ошибка декодирования FFmpeg: {e.stderr.decode()}")

    audio_array = np.frombuffer(out, np.float32).reshape(-1, 2).T
    return torch.from_numpy(audio_array)

def save_audio(tensor: torch.Tensor, output_path: Path, sample_rate: int = 44100, format: str = 'flac'):
    audio_array = tensor.cpu().numpy().T
    
    try:
        process = (
            ffmpeg.input('pipe:', format='f32le', acodec='pcm_f32le', ac=2, ar=sample_rate)
            .output(str(output_path), format=format, audio_bitrate='320k' if format == 'mp3' else None)
            .overwrite_output()
            .run_async(pipe_stdin=True, pipe_stderr=True)
        )
        process.communicate(input=audio_array.tobytes())
    except ffmpeg.Error as e:
        raise RuntimeError(f"Ошибка кодирования FFmpeg: {e.stderr.decode()}")