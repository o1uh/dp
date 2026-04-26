from celery import Celery
from src.core.config import settings

celery_app = Celery(
    "audio_platform",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_max_tasks_per_child=50 
)

celery_app.autodiscover_tasks(["src.modules.processing"])