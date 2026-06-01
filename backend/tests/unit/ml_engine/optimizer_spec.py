import sys
from unittest.mock import patch, MagicMock

sys.modules['torch'] = MagicMock()
sys.modules['demucs'] = MagicMock()
sys.modules['demucs.apply'] = MagicMock()

from src.ml_engine.optimizer import apply_inference_optimized

def test_audio_chunking_and_crossfading():
    mock_model = MagicMock()
    mock_parameter = MagicMock()
    mock_parameter.device = "cpu"
    mock_model.parameters.return_value = iter([mock_parameter])
    
    mock_audio_tensor = MagicMock()
    mock_audio_tensor.dim.return_value = 2
    mock_audio_tensor.unsqueeze.return_value = mock_audio_tensor
    mock_audio_tensor.to.return_value = mock_audio_tensor
    
    mock_sources = MagicMock()
    mock_result = MagicMock()
    mock_result.shape = (4, 2, 44100)
    mock_sources.squeeze.return_value.cpu.return_value = mock_result
    
    with patch("src.ml_engine.optimizer.apply_model", return_value=mock_sources) as mock_apply:
        result = apply_inference_optimized(mock_model, mock_audio_tensor, shifts=1)
        
        assert mock_audio_tensor.dim.call_count == 2
        mock_audio_tensor.unsqueeze.assert_called_with(0)
        mock_audio_tensor.to.assert_called_with("cpu")
        mock_apply.assert_called_once_with(
            mock_model, 
            mock_audio_tensor, 
            shifts=1, 
            split=True, 
            overlap=0.25, 
            progress=False
        )
        mock_sources.squeeze.assert_called_once_with(0)
        assert result == mock_result