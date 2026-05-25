import os
import gc
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
            self.model_4_stems_name = "htdemucs"
            self.model_guitar_path = "/app/weights/best.th"
            self.model_4_stems = None
            self.model_guitar = None
            self._is_initialized = True

    def load_4_stems_model(self):
        if self.model_4_stems is None:
            logger.info(f"Загрузка базовой модели {self.model_4_stems_name} на {self.device}...")
            self.model_4_stems = get_model(self.model_4_stems_name)
            self.model_4_stems.to(self.device)
            self.model_4_stems.eval()
            logger.info("Базовая модель успешно загружена.")
        return self.model_4_stems

    def unload_4_stems_model(self):
        if self.model_4_stems is not None:
            logger.info("Выгрузка базовой модели из памяти...")
            self.model_4_stems = None
            self._purge_vram()

    def load_guitar_model(self):
        if self.model_guitar is None:
            if not os.path.exists(self.model_guitar_path):
                fallback_path = os.path.join(os.getcwd(), "weights", "best.th")
                if os.path.exists(fallback_path):
                    self.model_guitar_path = fallback_path
                else:
                    raise FileNotFoundError(
                        f"Файл весов гитарной модели не найден по пути {self.model_guitar_path} или {fallback_path}"
                    )

            logger.info(f"Загрузка гитарной модели {self.model_guitar_path} на {self.device}...")
            
            try:
                checkpoint = torch.load(
                    self.model_guitar_path, 
                    map_location=self.device, 
                    weights_only=False
                )
                
                if isinstance(checkpoint, torch.nn.Module):
                    self.model_guitar = checkpoint
                    logger.info("Гитарная модель успешно загружена как целостный PyTorch-модуль.")
                elif isinstance(checkpoint, dict):
                    base_model = get_model(self.model_4_stems_name)
                    state_dict = checkpoint.get("state_dict", checkpoint.get("model", checkpoint))
                    
                    base_model.load_state_dict(state_dict, strict=False)
                    self.model_guitar = base_model
                    logger.info("Словарь состояний (state_dict) успешно загружен на базовую архитектуру htdemucs.")
                else:
                    raise TypeError("Формат файла весов не поддерживается нативной загрузкой PyTorch.")
                    
            except Exception as native_err:
                logger.warning(f"Нативная загрузка PyTorch не удалась: {native_err}. Попытка загрузки через demucs API...")
                try:
                    self.model_guitar = get_model(self.model_guitar_path)
                    logger.info("Гитарная модель успешно загружена через API demucs.")
                except Exception as demucs_err:
                    logger.error(f"Все доступные стратегии загрузки локальной модели завершились ошибкой: {demucs_err}")
                    raise demucs_err

            self.model_guitar.to(self.device)
            self.model_guitar.eval()
            logger.info("Гитарная модель успешно подготовлена к инференсу.")
            
        return self.model_guitar

    def unload_guitar_model(self):
        if self.model_guitar is not None:
            logger.info("Выгрузка гитарной модели из памяти...")
            self.model_guitar = None
            self._purge_vram()

    def _purge_vram(self):
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            logger.info("Очистка VRAM выполнена успешно.")

demucs_engine = DemucsEngine()