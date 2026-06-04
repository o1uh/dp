import ffmpeg
import numpy as np
import torch
from pathlib import Path
from src.core.logger import logger

def load_audio(file_path: Path, sample_rate: int = 44100) -> torch.Tensor:
    # logger.info(f"[FFMPEG DECODER] Opening file: {file_path}. Target Sample Rate: {sample_rate}Hz, Channels: 2, Format: Float32 LE")
    try:
        process = (
            ffmpeg.input(str(file_path))
            .output('pipe:', format='f32le', acodec='pcm_f32le', ac=2, ar=sample_rate)
        )
        # logger.info(f"[FFMPEG DECODER] Subprocess pipeline arguments: {process.compile()}")

        out, err = process.run(capture_stdout=True, capture_stderr=True)
        # logger.info(f"[FFMPEG DECODER SUCCESS] Decoding process completed. Output bytes count: {len(out)} bytes")
    except ffmpeg.Error as e:
        stderr_output = e.stderr.decode() if e.stderr else "No stderr output"
        logger.error(f"[FFMPEG DECODER ERROR] FFmpeg subprocess execution failed: {stderr_output}", exc_info=True)
        raise RuntimeError(f"Ошибка декодирования FFmpeg: {stderr_output}")

    # logger.info("[FFMPEG DECODER] Re-shaping output buffer to NumPy Float32 float-matrix array layout...")
    audio_array = np.frombuffer(out, np.float32).reshape(-1, 2).T
    # logger.info(f"[FFMPEG DECODER] NumPy array dimensions: {audio_array.shape}")

    # logger.info("[FFMPEG DECODER] Transforming NumPy layout to PyTorch tensor format...")
    tensor = torch.from_numpy(audio_array)
    return tensor

def save_audio(tensor: torch.Tensor, output_path: Path, sample_rate: int = 44100, format: str = 'flac'):
    # logger.info(f"[FFMPEG ENCODER] Initiating audio compilation. Target path: {output_path}, Sample Rate: {sample_rate}Hz, Format: {format}")
    audio_array = tensor.cpu().numpy().T
    # logger.info(f"[FFMPEG ENCODER] Array source memory bounds: {audio_array.shape}, DataType: {audio_array.dtype}")

    output_params = {}
    if format == 'mp3':
        output_params['format'] = 'mp3'
        output_params['audio_bitrate'] = '320k'
        # logger.info("[FFMPEG ENCODER] MP3 encoding target parameters set: Bitrate = 320kbps")
    else:
        # logger.info("[FFMPEG ENCODER] FLAC standard target parameters set")
        pass

    try:
        # logger.info(f"[FFMPEG ENCODER] Initializing async pipe writer stream for output: {output_path}...")
        process = (
            ffmpeg.input('pipe:', format='f32le', acodec='pcm_f32le', ac=2, ar=sample_rate)
            .output(str(output_path), **output_params)
            .overwrite_output()
            .run_async(pipe_stdin=True, pipe_stderr=True)
        )

        # logger.info("[FFMPEG ENCODER] Direct piping matrix byte blocks to FFmpeg input stream...")
        raw_bytes = audio_array.tobytes()
        # logger.info(f"[FFMPEG ENCODER] Total payload bytes size: {len(raw_bytes)} bytes")

        stdout_data, stderr_data = process.communicate(input=raw_bytes)

        if process.returncode != 0:
            stderr_str = stderr_data.decode() if stderr_data else "No stderr data"
            logger.error(f"[FFMPEG ENCODER ERROR] FFmpeg subprocess execution terminated with exit code {process.returncode}: {stderr_str}")
            raise RuntimeError(f"FFmpeg encoder error: {stderr_str}")

        # logger.info(f"[FFMPEG ENCODER SUCCESS] Audio file compiled successfully: {output_path}")
    except ffmpeg.Error as e:
        stderr_output = e.stderr.decode() if e.stderr else "No stderr output"
        logger.error(f"[FFMPEG ENCODER ERROR] FFmpeg encoding process raised: {stderr_output}", exc_info=True)
        raise RuntimeError(f"Ошибка кодирования FFmpeg: {stderr_output}")