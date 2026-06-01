import torch
from demucs.apply import apply_model
from src.core.logger import logger

def apply_inference_optimized(model, audio_tensor: torch.Tensor, shifts: int = 1, split: bool = True) -> torch.Tensor:
    logger.info(f"Configuring optimizer parameters. Base tensor dimensions: {audio_tensor.dim()}, shape: {audio_tensor.shape}")
    
    if audio_tensor.dim() == 2:
        logger.info("Unsquared tensor dimensions. Adding extra channels dimension index [0] to match Demucs dimensions...")
        audio_tensor = audio_tensor.unsqueeze(0)
        logger.info(f"Dimension adjusted. New shape properties: {audio_tensor.shape}")
        
    device = next(model.parameters()).device
    logger.info(f"Active model layer mapped on device: {device}. Transferring input tensor matrix payload to memory on: {device}...")
    audio_tensor = audio_tensor.to(device)

    logger.info("Forcing inference with PyTorch autograd engine disabled (no_grad)...")
    with torch.no_grad():
        logger.info(f"Invoking apply_model inference call with parameters - Shifts: {shifts}, Split processing: {split}, Overlap: 0.25")
        sources = apply_model(
            model, 
            audio_tensor, 
            shifts=shifts, 
            split=split, 
            overlap=0.25, 
            progress=False
        )
        logger.info("Inference completed. Extracting results matrices...")
        
    logger.info("Extracting first batch index element and copying data blocks back to CPU system memory...")
    result_tensor = sources.squeeze(0).cpu()
    logger.info(f"Matrix transport operation successful. Final output shape properties: {result_tensor.shape}")
    return result_tensor