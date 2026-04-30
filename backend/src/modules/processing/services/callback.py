import json
import httpx
from datetime import datetime
from redis.asyncio import Redis
from sqlalchemy import select, update
from src.infrastructure.db.uow import UnitOfWork
from src.modules.processing.models import ProcessingTask, Stem
from src.modules.storage.models import File
from src.modules.billing.models import UsageLog, UserQuotaCurrent
from src.modules.users.models import ApiKey
from src.modules.processing.schemas import WebhookPayload
from src.common.enums import TaskStatus, FileProcessingStatus
from src.core.config import settings
from src.core.logger import logger

async def process_webhook(payload: WebhookPayload):
    async with UnitOfWork() as uow:
        result = await uow.session.execute(
            select(ProcessingTask).where(ProcessingTask.id == payload.task_id)
        )
        task = result.scalar_one_or_none()
        if not task:
            return

        file_result = await uow.session.execute(
            select(File).where(File.id == payload.file_id)
        )
        file_obj = file_result.scalar_one_or_none()
        
        task.status = TaskStatus(payload.status)
        task.completed_at = datetime.utcnow()
        if payload.error_message:
            task.error_message = payload.error_message

        if file_obj:
            file_obj.processing_status = FileProcessingStatus.ready if payload.status == "completed" else FileProcessingStatus.error

        if payload.status == "completed":
            total_bytes = 0
            for stem_data in payload.stems:
                stem = Stem(
                    file_id=payload.file_id,
                    task_id=payload.task_id,
                    **stem_data.model_dump()
                )
                uow.session.add(stem)
                total_bytes += stem.file_size_bytes

            if file_obj:
                usage_log = UsageLog(
                    user_id=task.user_id,
                    task_id=task.id,
                    duration_sec_used=file_obj.duration_sec,
                    storage_bytes_used=total_bytes
                )
                uow.session.add(usage_log)

        elif payload.status == "failed" and file_obj:
            await uow.session.execute(
                update(UserQuotaCurrent)
                .where(UserQuotaCurrent.user_id == task.user_id)
                .values(
                    duration_used_sec=UserQuotaCurrent.duration_used_sec - file_obj.duration_sec
                )
            )

        webhook_url = None
        if task.api_key_id:
            api_key_result = await uow.session.execute(
                select(ApiKey).where(ApiKey.id == task.api_key_id)
            )
            api_key = api_key_result.scalar_one_or_none()
            if api_key and api_key.webhook_url:
                webhook_url = api_key.webhook_url

        await uow.commit()

    if webhook_url:
        async with httpx.AsyncClient() as client:
            try:
                await client.post(webhook_url, json=payload.model_dump(), timeout=5.0)
            except Exception as e:
                logger.error(f"Failed to send B2B webhook to {webhook_url}: {e}")

    redis = Redis.from_url(settings.REDIS_URL)
    event = {
        "user_id": str(task.user_id),
        "payload": {
            "event": "TrackReady",
            "task_id": str(task.id),
            "status": payload.status
        }
    }
    await redis.publish("system_events", json.dumps(event))
    await redis.close()