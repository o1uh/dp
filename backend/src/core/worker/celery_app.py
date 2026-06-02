from celery import Celery
from src.core.config import settings
from src.core.logger import logger

logger.info(f"[CELERY BOOTSTRAP] Initializing Celery application. Broker URL: {settings.REDIS_URL}, Backend URL: {settings.REDIS_URL}")
celery_app = Celery(
    "audio_platform",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

logger.info("[CELERY BOOTSTRAP] Applying worker tuning configurations...")
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_max_tasks_per_child=50 
)

logger.info("[CELERY BOOTSTRAP] Triggering task autodiscovery for module boundaries: ['src.modules.processing']...")
celery_app.autodiscover_tasks(["src.modules.processing"])
logger.info("[CELERY BOOTSTRAP] Celery application successfully configured.")

from celery.signals import after_setup_logger, after_setup_task_logger
from src.core.logger import setup_logger

@after_setup_logger.connect
@after_setup_task_logger.connect
def setup_celery_logging(logger, **kwargs):
    setup_logger()