import os
import gc
import torch
from demucs.pretrained import get_model
from src.core.logger import logger

class DemucsEngine:
    _instance = None
    _is_initialized = False

    def __new__(cls):
        if cls._instance is None:
            logger.info("Initializing DemucsEngine Singleton instance...")
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
            # logger.info(f"DemucsEngine core variables set. Target device selected: {self.device}")

    def load_4_stems_model(self):
        # logger.info(f"Checking load status of basic HTDemucs model. Device: {self.device}")
        if self.model_4_stems is None:
            logger.info(f"Loading base HTDemucs model '{self.model_4_stems_name}' onto: {self.device}...")
            self.model_4_stems = get_model(self.model_4_stems_name)
            # logger.info("Transferring model weights parameters to target device...")
            self.model_4_stems.to(self.device)
            # logger.info("Configuring model state to inference mode (eval)...")
            self.model_4_stems.eval()
            # logger.info("Base model successfully initialized and warm-loaded.")
        # else:
        #     logger.info("Reusing existing base HTDemucs model instance from memory.")
        return self.model_4_stems

    def unload_4_stems_model(self):
        # logger.info("Unload request received for base HTDemucs model weights.")
        if self.model_4_stems is not None:
            self.model_4_stems = None
            # logger.info("Reference cleared. Invoking explicit garbage collection and VRAM purge...")
            self._purge_vram()
        # else:
        #     logger.info("Base model weights were already clean.")

    def load_guitar_model(self):
        # logger.info("Checking load status of custom PyTorch guitar model weights.")
        if self.model_guitar is None:
            if not os.path.exists(self.model_guitar_path):
                fallback_path = os.path.join(os.getcwd(), "weights", "best.th")
                # logger.info(f"Primary model path {self.model_guitar_path} missing. Checking fallback path: {fallback_path}")
                if os.path.exists(fallback_path):
                    self.model_guitar_path = fallback_path
                else:
                    logger.error(f"Inference critical block: Weight file missing. Search locations: {self.model_guitar_path}, {fallback_path}")
                    raise FileNotFoundError(
                        f"Файл весов гитарной модели не найден по пути {self.model_guitar_path} или {fallback_path}"
                    )

            # logger.info(f"Reading state dictionary parameters from: {self.model_guitar_path}")
            try:
                checkpoint = torch.load(
                    self.model_guitar_path,
                    map_location=self.device,
                    weights_only=False
                )

                if isinstance(checkpoint, torch.nn.Module):
                    # logger.info("Checkpoint identified as unified PyTorch module model structure.")
                    self.model_guitar = checkpoint
                elif isinstance(checkpoint, dict):
                    # logger.info("Checkpoint identified as state parameters dictionary structure. Constructing model architecture...")
                    base_model = get_model(self.model_4_stems_name)
                    state_dict = checkpoint.get("state_dict", checkpoint.get("model", checkpoint))
                    # logger.info("Mapping state weights dictionary parameters onto base HTDemucs model topology...")
                    base_model.load_state_dict(state_dict, strict=False)
                    self.model_guitar = base_model
                else:
                    logger.error("Loaded checkpoint structure does not match standard serialization paradigms")
                    raise TypeError("Формат файла весов не поддерживается нативной загрузкой PyTorch.")

            except Exception as native_err:
                logger.warning(f"Native loader pipeline failed with error: {native_err}. Attempting Demucs API wrapper loader pipeline...")
                try:
                    self.model_guitar = get_model(self.model_guitar_path)
                    # logger.info("Guitar weights mapped successfully via Demucs built-in weights importer.")
                except Exception as demucs_err:
                    logger.error(f"Inference critical block: All load strategies exhausted. Error trace: {demucs_err}")
                    raise demucs_err

            # logger.info("Transferring custom guitar model weights to device memory...")
            self.model_guitar.to(self.device)
            self.model_guitar.eval()
            # logger.info("Custom evaluation engine ready for guitar extraction operations.")

        return self.model_guitar

    def unload_guitar_model(self):
        # logger.info("Unload request received for custom guitar extraction model weights.")
        if self.model_guitar is not None:
            self.model_guitar = None
            # logger.info("Reference cleared. Invoking explicit garbage collection and VRAM purge...")
            self._purge_vram()
        # else:
        #     logger.info("Guitar model weights were already clean.")

    def _purge_vram(self):
        # logger.info("Purging system garbage and resetting VRAM cache limits...")
        gc.collect()
        if torch.cuda.is_available():
            # logger.info("Before purge: VRAM Cache usage: " + str(torch.cuda.memory_reserved() / 1024 / 1024) + "MB")
            torch.cuda.empty_cache()
            # logger.info("After purge: VRAM Cache usage: " + str(torch.cuda.memory_reserved() / 1024 / 1024) + "MB")
            # logger.info("VRAM hardware empty_cache call completed successfully.")
            pass
        # else:
        #     logger.info("CUDA not active. Garbage collection completed on RAM limits.")

demucs_engine = DemucsEngine()