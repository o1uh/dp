import json
import httpx
import uuid
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
from src.infrastructure.s3.presigned import generate_get_url

async def process_webhook(payload: WebhookPayload):
    logger.info(f"Processing incoming worker callback webhook payload. Task ID: {payload.task_id}, Status: {payload.status}")
    task_uuid = uuid.UUID(payload.task_id)
    file_uuid = uuid.UUID(payload.file_id)

    async with UnitOfWork() as uow:
        logger.info(f"Resolving ProcessingTask ID: {task_uuid}")
        result = await uow.session.execute(
            select(ProcessingTask).where(ProcessingTask.id == task_uuid)
        )
        task = result.scalar_one_or_none()
        if not task:
            logger.error(f"Callback processing aborted. ProcessingTask not found in database. ID: {task_uuid}")
            return

        logger.info(f"Resolving File ID: {file_uuid}")
        file_result = await uow.session.execute(
            select(File).where(File.id == file_uuid)
        )
        file_obj = file_result.scalar_one_or_none()
        
        logger.info(f"Updating task status from worker response. Task: {task_uuid}, Status: '{payload.status}'")
        task.status = TaskStatus(payload.status)
        task.completed_at = datetime.utcnow()
        if payload.error_message:
            logger.warning(f"Error payload logged inside task record. Error message: {payload.error_message}")
            task.error_message = payload.error_message

        if file_obj:
            logger.info(f"Updating File record upload state: {file_uuid}")
            file_obj.processing_status = FileProcessingStatus.ready if payload.status == "completed" else FileProcessingStatus.error

        tasks_to_complete = {task_uuid: task}

        if payload.status == "completed":
            logger.info("Worker reports successful execution. Commencing stems inventory registration...")
            total_bytes = 0
            for stem_data in payload.stems:
                stem_task_id = uuid.UUID(stem_data.task_id) if stem_data.task_id else task_uuid
                logger.info(f"Asserting stems output registration metadata. Class: '{stem_data.stem_class}', Parent Task: {stem_task_id}")
                
                if stem_task_id not in tasks_to_complete:
                    logger.info(f"Task transition required. Resolving parent task: {stem_task_id}")
                    alt_task_res = await uow.session.execute(
                        select(ProcessingTask).where(ProcessingTask.id == stem_task_id)
                    )
                    alt_task = alt_task_res.scalar_one_or_none()
                    if alt_task:
                        logger.info(f"Transitioning parent task ID {alt_task.id} to completed state...")
                        alt_task.status = TaskStatus.completed
                        alt_task.completed_at = datetime.utcnow()
                        tasks_to_complete[stem_task_id] = alt_task

                logger.info(f"Scanning for existing physical Stem records. Class: '{stem_data.stem_class}', Version: '{stem_data.model_version}'")
                stmt_exists = select(Stem).where(
                    Stem.file_id == file_uuid,
                    Stem.stem_class == stem_data.stem_class,
                    Stem.model_version == stem_data.model_version
                )
                existing_stem = (await uow.session.execute(stmt_exists)).scalar_one_or_none()

                if existing_stem:
                    logger.info(f"Updating S3 pointers for existing Stem record ID: {existing_stem.id}")
                    existing_stem.task_id = stem_task_id
                    existing_stem.s3_key_flac = stem_data.s3_key_flac
                    existing_stem.s3_key_mp3 = stem_data.s3_key_mp3
                    existing_stem.file_size_bytes = stem_data.file_size_bytes
                    total_bytes += stem_data.file_size_bytes
                else:
                    logger.info(f"Creating new physical Stem record. S3 path: {stem_data.s3_key_mp3}")
                    stem = Stem(
                        file_id=file_uuid,
                        task_id=stem_task_id,
                        stem_class=stem_data.stem_class,
                        model_version=stem_data.model_version,
                        s3_key_flac=stem_data.s3_key_flac,
                        s3_key_mp3=stem_data.s3_key_mp3,
                        file_size_bytes=stem_data.file_size_bytes
                    )
                    uow.session.add(stem)
                    total_bytes += stem.file_size_bytes

            if file_obj:
                logger.info(f"Writing transactional Billing Log. User: {task.user_id}, Task: {task.id}, Bytes: {total_bytes}, Seconds: {file_obj.duration_sec}")
                usage_log = UsageLog(
                    user_id=task.user_id,
                    task_id=task.id,
                    duration_sec_used=file_obj.duration_sec,
                    storage_bytes_used=total_bytes
                )
                uow.session.add(usage_log)

        elif payload.status == "failed":
            logger.warning(f"Inference calculations failed for task: {task_uuid}. Reverting quota balances...")
            parent_task_id_str = task.model_config.get("parent_task_id")
            if parent_task_id_str:
                parent_task_uuid = uuid.UUID(parent_task_id_str)
                logger.info(f"Failing cascade parent task ID: {parent_task_uuid}")
                parent_task_res = await uow.session.execute(
                    select(ProcessingTask).where(ProcessingTask.id == parent_task_uuid)
                )
                parent_task = parent_task_res.scalar_one_or_none()
                if parent_task:
                    parent_task.status = TaskStatus.failed
                    parent_task.completed_at = datetime.utcnow()
                    parent_task.error_message = payload.error_message

            if file_obj:
                logger.info(f"Releasing reserved quota minutes. Refunding: {file_obj.duration_sec}s to User: {task.user_id}")
                await uow.session.execute(
                    update(UserQuotaCurrent)
                    .where(UserQuotaCurrent.user_id == task.user_id)
                    .values(
                        duration_used_sec=UserQuotaCurrent.duration_used_sec - file_obj.duration_sec
                    )
                )

        webhook_url = None
        if task.api_key_id:
            logger.info(f"B2B integration profile linked. Resolving API Key: {task.api_key_id}")
            api_key_result = await uow.session.execute(
                select(ApiKey).where(ApiKey.id == task.api_key_id)
            )
            api_key = api_key_result.scalar_one_or_none()
            if api_key and api_key.webhook_url:
                webhook_url = api_key.webhook_url
                logger.info(f"B2B Webhook target endpoint resolved: {webhook_url}")

        download_url = None
        if task.model_config.get("type") == "render" and payload.status == "completed":
            s3_key_zip = f"renders/{file_uuid}/stems.zip"
            logger.info(f"Render completed. Fetching download S3 GET presigned path for ZIP package key: {s3_key_zip}")
            download_url = await generate_get_url("audio-platform-uploads", s3_key_zip)

        logger.info("Committing webhook state transaction changes...")
        await uow.commit()
        logger.info("Callback status state successfully persisted and database locks released.")

    if webhook_url:
        logger.info(f"Sending downstream B2B webhook callback update to partner endpoint: {webhook_url}")
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(webhook_url, json=payload.model_dump(), timeout=5.0)
                logger.info(f"Partner callback response: status code: {response.status_code}")
            except Exception as e:
                logger.error(f"Failed to dispatch B2B callback webhook update to {webhook_url}: {e}")

    logger.info("Connecting to Redis to publish task execution update to system Pub/Sub channel...")
    redis = Redis.from_url(settings.REDIS_URL)
    event = {
        "user_id": str(task.user_id),
        "payload": {
            "event": "TrackReady",
            "task_id": str(task.id),
            "file_id": str(file_obj.id) if file_obj else None,
            "status": payload.status,
            "task_type": task.model_config.get("type"),
            "download_url": download_url
        }
    }
    logger.info(f"Publishing event package to channel 'system_events': {event}")
    await redis.publish("system_events", json.dumps(event))
    await redis.close()
    logger.info("Pub/Sub socket message dispatched.")