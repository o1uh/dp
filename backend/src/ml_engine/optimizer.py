import torch
from demucs.apply import apply_model

def apply_inference_optimized(model, audio_tensor: torch.Tensor, shifts: int = 1, split: bool = True) -> torch.Tensor:
    
    # audio_tensor должен иметь размерность [1, channels, samples] для demucs
    if audio_tensor.dim() == 2:
        audio_tensor = audio_tensor.unsqueeze(0)
        
    device = next(model.parameters()).device
    audio_tensor = audio_tensor.to(device)

    with torch.no_grad():
        # возврат тензора размерности [1, sources, channels, samples]
        sources = apply_model(
            model, 
            audio_tensor, 
            shifts=shifts, 
            split=split, 
            overlap=0.25, 
            progress=False
        )
        
    return sources.squeeze(0).cpu()