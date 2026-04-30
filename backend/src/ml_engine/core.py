import os
import torch
import logging
from demucs.pretrained import get_model

logger = logging.getLogger("audio_platform.ml_engine")

class DemucsEngine:
    _instance = None
    _is_initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DemucsEngine, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._is_initialized:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model_name = "htdemucs"
            self.model = None
            self._is_initialized = True

    def load_model(self):
        if self.model is None:
            logger.info(f"Загрузка модели {self.model_name} на устройство {self.device}...")
            # по умолчанию Demucs скачивает веса в ~/.cache/torch/hub/checkpoints
            # пути переопределяются через переменные окружения (TORCH_HOME)
            self.model = get_model(self.model_name)
            self.model.to(self.device)
            self.model.eval()
            logger.info("Модель успешно загружена.")

    def get_model(self):
        if self.model is None:
            self.load_model()
        return self.model

demucs_engine = DemucsEngine()