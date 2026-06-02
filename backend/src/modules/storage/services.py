import uuid
from sqlalchemy import select
from src.infrastructure.db.uow import UnitOfWork
from src.modules.storage.repositories import FileRepository
from src.modules.storage.models import File
from src.modules.storage.schemas import FileUploadRequest, FileUploadResponse
from src.infrastructure.s3.presigned import generate_put_url
from src.common.enums import FileProcessingStatus, TaskStatus
from src.core.logger import logger

BUCKET_NAME = "audio-platform-uploads"

async def init_upload(data: FileUploadRequest, user_id: str) -> FileUploadResponse:
    from src.modules.processing.models import Stem, ProcessingTask
    from src.modules.library.models import Track, UserStem

    logger.info(f"Initiating upload process. User ID: {user_id}, File Hash: {data.file_hash}, Name: {data.original_filename}")
    async with UnitOfWork() as uow:
        repo = FileRepository(uow.session)
        logger.info(f"Querying repository for existing file hash: {data.file_hash}")
        existing_file = await repo.get_by_hash(data.file_hash)
        
        if existing_file:
            logger.info(f"File hash match found. ID: {existing_file.id}, Status: {existing_file.processing_status}")
            if existing_file.processing_status in [FileProcessingStatus.uploaded, FileProcessingStatus.processing, FileProcessingStatus.ready]:
                stems_data = []
                
                if existing_file.processing_status == FileProcessingStatus.ready:
                    logger.info(f"Deduplication process triggered. Fetching completed tasks for File: {existing_file.id}")
                    stmt_tasks = select(ProcessingTask).where(
                        ProcessingTask.file_id == existing_file.id,
                        ProcessingTask.status == TaskStatus.completed
                    )
                    completed_tasks = (await uow.session.execute(stmt_tasks)).scalars().all()
                    logger.info(f"Completed processing tasks found: {len(completed_tasks)}")
                    
                    if data.separation_mode == "cascade_guitar":
                        allowed_tasks = [t for t in completed_tasks if t.model_config.get("model") in ["htdemucs", "cascade_guitar"]]
                    else:
                        allowed_tasks = [t for t in completed_tasks if t.model_config.get("model") == "htdemucs"]

                    has_guitar_task = any(t.model_config.get("model") == "cascade_guitar" for t in allowed_tasks)
                    logger.info(f"Deduplication routing - Mode: {data.separation_mode}, Has active guitar task: {has_guitar_task}")
                    
                    if data.separation_mode == "cascade_guitar" and not has_guitar_task:
                        logger.info("Cascade guitar separation requested but no cached guitar task exists. Instant cloning suspended.")
                        stems_data = []
                    else:
                        if allowed_tasks:
                            logger.info(f"Querying existing track aliases for User: {user_id}, File: {existing_file.id}")
                            stmt_check = select(Track).where(
                                Track.user_id == uuid.UUID(user_id),
                                Track.file_id == existing_file.id,
                                Track.deleted_at.is_(None)
                            )
                            track = (await uow.session.execute(stmt_check)).scalar_one_or_none()
                            
                            if not track:
                                logger.info(f"No track alias exists for user {user_id}. Creating new virtual Track profile...")
                                
                                import os
                                title_without_ext = os.path.splitext(data.original_filename)[0]
                                
                                track = Track(
                                    user_id=uuid.UUID(user_id),
                                    file_id=existing_file.id,
                                    title=title_without_ext,
                                    original_filename=data.original_filename
                                )
                                uow.session.add(track)
                                await uow.session.flush()
                                logger.info(f"Virtual Track profile registered with ID: {track.id}")

                            for task_orig in allowed_tasks:
                                logger.info(f"Asserting task mapping cloning for original task: {task_orig.id}, Model: {task_orig.model_config.get('model')}")
                                
                                stmt_task_check = select(ProcessingTask).where(
                                    ProcessingTask.file_id == existing_file.id,
                                    ProcessingTask.user_id == uuid.UUID(user_id)
                                )
                                cloned_tasks = (await uow.session.execute(stmt_task_check)).scalars().all()
                                
                                target_model = task_orig.model_config.get("model", "htdemucs")
                                cloned_task = next(
                                    (t for t in cloned_tasks if t.model_config.get("model") == target_model),
                                    None
                                )

                                if not cloned_task:
                                    logger.info(f"Instantiating cloned metadata processing task object for User: {user_id}")
                                    cloned_task = ProcessingTask(
                                        user_id=uuid.UUID(user_id),
                                        file_id=existing_file.id,
                                        model_config=task_orig.model_config,
                                        status=TaskStatus.completed,
                                        celery_task_id=task_orig.celery_task_id,
                                        started_at=task_orig.started_at,
                                        completed_at=task_orig.completed_at
                                    )
                                    uow.session.add(cloned_task)
                                    await uow.session.flush()
                                    logger.info(f"Task successfully cloned. ID: {cloned_task.id}")

                                logger.info(f"Fetching S3 physical stems metadata for task: {task_orig.id}")
                                stmt_stems = select(Stem).where(Stem.task_id == task_orig.id)
                                orig_stems = (await uow.session.execute(stmt_stems)).scalars().all()

                                for s_orig in orig_stems:
                                    logger.info(f"Mapping user stem associations. Stem ID: {s_orig.id}, Class: {s_orig.stem_class}")
                                    stmt_us_check = select(UserStem).where(
                                        UserStem.user_id == uuid.UUID(user_id),
                                        UserStem.stem_id == s_orig.id
                                    )
                                    existing_us = (await uow.session.execute(stmt_us_check)).scalar_one_or_none()
                                    
                                    if not existing_us:
                                        logger.info(f"Linking UserStem mapping record to Track: {track.id}")
                                        user_stem = UserStem(
                                            user_id=uuid.UUID(user_id),
                                            stem_id=s_orig.id,
                                            track_id=track.id
                                        )
                                        uow.session.add(user_stem)

                                    stems_data.append({
                                        "stem_class": s_orig.stem_class,
                                        "s3_key_flac": s_orig.s3_key_flac,
                                        "s3_key_mp3": s_orig.s3_key_mp3
                                    })

                            logger.info("Committing deduplicated cloning transaction changes...")
                            await uow.commit()
                            logger.info(f"Deduplication completed. Instant clone response dispatched for File: {existing_file.id}")

                            return FileUploadResponse(
                                is_duplicate=True,
                                file_id=existing_file.id,
                                s3_key=existing_file.s3_key_original,
                                stems=stems_data if stems_data else None
                            )
            
            logger.info(f"Generating S3 upload URL for existing unconfirmed file record ID: {existing_file.id}")
            upload_url = await generate_put_url(BUCKET_NAME, existing_file.s3_key_original, existing_file.mime_type)
            return FileUploadResponse(
                is_duplicate=False,
                upload_url=upload_url,
                file_id=existing_file.id,
                s3_key=existing_file.s3_key_original
            )

        new_file_id = uuid.uuid4()
        s3_key = f"originals/{new_file_id}/{data.original_filename}"
        logger.info(f"No existing file hash detected. Registering new database entity. ID: {new_file_id}, S3 Key: {s3_key}")
        
        new_file = File(
            id=new_file_id,
            file_hash=data.file_hash,
            s3_key_original=s3_key,
            mime_type=data.mime_type,
            file_size_bytes=data.file_size_bytes,
            duration_sec=data.duration_sec,
            processing_status=FileProcessingStatus.awaiting_upload
        )
        repo.add(new_file)
        await uow.session.flush()

        logger.info(f"Requesting S3 presigned PUT URL for original file upload: {s3_key}")
        upload_url = await generate_put_url(BUCKET_NAME, s3_key, data.mime_type)
        response = FileUploadResponse(
            is_duplicate=False,
            upload_url=upload_url,
            file_id=new_file.id,
            s3_key=s3_key
        )
        logger.info("Committing new file registration transaction context...")
        await uow.commit()
        logger.info(f"New file structure committed and prepared for upload. File ID: {new_file.id}")
        return response


async def confirm_upload(file_id: str) -> None:
    logger.info(f"Confirming upload status for File ID: {file_id}")
    async with UnitOfWork() as uow:
        repo = FileRepository(uow.session)
        file_obj = await repo.get_by_id(file_id)
        
        if file_obj:
            logger.info(f"Asserting file processing state. Current state: {file_obj.processing_status}")
            if file_obj.processing_status == FileProcessingStatus.awaiting_upload:
                logger.info(f"Transitioning file state to: {FileProcessingStatus.uploaded}")
                file_obj.processing_status = FileProcessingStatus.uploaded
                await uow.commit()
                logger.info(f"File status commit successful. File ID: {file_id}")
            else:
                logger.warning(f"File state transition ignored. File ID: {file_id} status is already: {file_obj.processing_status}")
        else:
            logger.error(f"Failed to confirm upload. Record not found. File ID: {file_id}")