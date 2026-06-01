import uuid
from sqlalchemy import select
from src.infrastructure.db.uow import UnitOfWork
from src.modules.storage.repositories import FileRepository
from src.modules.storage.models import File
from src.modules.storage.schemas import FileUploadRequest, FileUploadResponse
from src.infrastructure.s3.presigned import generate_put_url
from src.common.enums import FileProcessingStatus, TaskStatus

BUCKET_NAME = "audio-platform-uploads"

async def init_upload(data: FileUploadRequest, user_id: str) -> FileUploadResponse:
    from src.modules.processing.models import Stem, ProcessingTask
    from src.modules.library.models import Track, UserStem

    async with UnitOfWork() as uow:
        repo = FileRepository(uow.session)
        existing_file = await repo.get_by_hash(data.file_hash)
        
        if existing_file:
            if existing_file.processing_status in [FileProcessingStatus.uploaded, FileProcessingStatus.processing, FileProcessingStatus.ready]:
                stems_data = []
                
                if existing_file.processing_status == FileProcessingStatus.ready:
                    stmt_tasks = select(ProcessingTask).where(
                        ProcessingTask.file_id == existing_file.id,
                        ProcessingTask.status == TaskStatus.completed
                    )
                    completed_tasks = (await uow.session.execute(stmt_tasks)).scalars().all()
                    
                    if data.separation_mode == "cascade_guitar":
                        allowed_tasks = [t for t in completed_tasks if t.model_config.get("model") in ["htdemucs", "cascade_guitar"]]
                    else:
                        allowed_tasks = [t for t in completed_tasks if t.model_config.get("model") == "htdemucs"]

                    has_guitar_task = any(t.model_config.get("model") == "cascade_guitar" for t in allowed_tasks)
                    
                    if data.separation_mode == "cascade_guitar" and not has_guitar_task:
                        stems_data = []
                    else:
                        if allowed_tasks:
                            stmt_check = select(Track).where(
                                Track.user_id == uuid.UUID(user_id),
                                Track.file_id == existing_file.id,
                                Track.deleted_at.is_(None)
                            )
                            track = (await uow.session.execute(stmt_check)).scalar_one_or_none()
                            
                            if not track:
                                track = Track(
                                    user_id=uuid.UUID(user_id),
                                    file_id=existing_file.id,
                                    title=data.original_filename,
                                    original_filename=data.original_filename
                                )
                                uow.session.add(track)
                                await uow.session.flush()

                            for task_orig in allowed_tasks:
                                stmt_task_check = select(ProcessingTask).where(
                                    ProcessingTask.file_id == existing_file.id,
                                    ProcessingTask.user_id == uuid.UUID(user_id),
                                    ProcessingTask.model_config == task_orig.model_config
                                )
                                cloned_task = (await uow.session.execute(stmt_task_check)).scalar_one_or_none()

                                if not cloned_task:
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

                                stmt_stems = select(Stem).where(Stem.task_id == task_orig.id)
                                orig_stems = (await uow.session.execute(stmt_stems)).scalars().all()

                                for s_orig in orig_stems:
                                    stmt_us_check = select(UserStem).where(
                                        UserStem.user_id == uuid.UUID(user_id),
                                        UserStem.stem_id == s_orig.id
                                    )
                                    existing_us = (await uow.session.execute(stmt_us_check)).scalar_one_or_none()
                                    
                                    if not existing_us:
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

                            await uow.commit()

                            return FileUploadResponse(
                                is_duplicate=True,
                                file_id=existing_file.id,
                                s3_key=existing_file.s3_key_original,
                                stems=stems_data if stems_data else None
                            )
            
            upload_url = await generate_put_url(BUCKET_NAME, existing_file.s3_key_original, existing_file.mime_type)
            return FileUploadResponse(
                is_duplicate=False,
                upload_url=upload_url,
                file_id=existing_file.id,
                s3_key=existing_file.s3_key_original
            )

        s3_key = f"originals/{uuid.uuid4()}/{data.original_filename}"
        new_file = File(
            file_hash=data.file_hash,
            s3_key_original=s3_key,
            mime_type=data.mime_type,
            file_size_bytes=data.file_size_bytes,
            duration_sec=data.duration_sec,
            processing_status=FileProcessingStatus.awaiting_upload
        )
        repo.add(new_file)
        await uow.session.flush()

        upload_url = await generate_put_url(BUCKET_NAME, s3_key, data.mime_type)
        response = FileUploadResponse(
            is_duplicate=False,
            upload_url=upload_url,
            file_id=new_file.id,
            s3_key=s3_key
        )
        await uow.commit()
        return response


async def confirm_upload(file_id: str) -> None:
    async with UnitOfWork() as uow:
        repo = FileRepository(uow.session)
        file_obj = await repo.get_by_id(file_id)
        if file_obj and file_obj.processing_status == FileProcessingStatus.awaiting_upload:
            file_obj.processing_status = FileProcessingStatus.uploaded
            await uow.commit()