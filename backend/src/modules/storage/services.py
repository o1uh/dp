import uuid
from sqlalchemy import select
from src.infrastructure.db.uow import UnitOfWork
from src.modules.storage.repositories import FileRepository
from src.modules.storage.models import File
from src.modules.storage.schemas import FileUploadRequest, FileUploadResponse
from src.infrastructure.s3.presigned import generate_put_url
from src.common.enums import FileProcessingStatus
from src.modules.processing.models import Stem
from src.modules.library.models import Track, UserStem

BUCKET_NAME = "audio-platform-uploads"

async def init_upload(data: FileUploadRequest, user_id: str) -> FileUploadResponse:
    async with UnitOfWork() as uow:
        repo = FileRepository(uow.session)
        existing_file = await repo.get_by_hash(data.file_hash)
        
        if existing_file:
            if existing_file.processing_status in [FileProcessingStatus.uploaded, FileProcessingStatus.processing, FileProcessingStatus.ready]:
                stems_data = []
                
                if existing_file.processing_status == FileProcessingStatus.ready:
                    stmt_check = select(Track).where(
                        Track.user_id == uuid.UUID(user_id),
                        Track.file_id == existing_file.id,
                        Track.deleted_at.is_(None)
                    )
                    existing_track = (await uow.session.execute(stmt_check)).scalar_one_or_none()
                    
                    if not existing_track:
                        track = Track(
                            user_id=uuid.UUID(user_id),
                            file_id=existing_file.id,
                            title=data.original_filename,
                            original_filename=data.original_filename
                        )
                        uow.session.add(track)
                        await uow.session.flush()

                        stmt_stems = select(Stem).where(Stem.file_id == existing_file.id)
                        physical_stems = (await uow.session.execute(stmt_stems)).scalars().all()

                        user_stems = [
                            UserStem(
                                user_id=uuid.UUID(user_id),
                                stem_id=ps.id,
                                track_id=track.id
                            ) for ps in physical_stems
                        ]
                        uow.session.add_all(user_stems)

                    stmt = select(Stem).where(Stem.file_id == existing_file.id)
                    result = await uow.session.execute(stmt)
                    stems = result.scalars().all()
                    stems_data = [
                        {
                            "stem_class": s.stem_class, 
                            "s3_key_flac": s.s3_key_flac, 
                            "s3_key_mp3": s.s3_key_mp3
                        } for s in stems
                    ]

                await uow.commit()

                return FileUploadResponse(
                    is_duplicate=True,
                    file_id=existing_file.id,
                    s3_key=existing_file.s3_key_original,
                    stems=stems_data if stems_data else None
                )
            
            # повторная выдача ссылки, если загрузка прервалась (awaiting_upload) или была ошибка
            upload_url = await generate_put_url(BUCKET_NAME, existing_file.s3_key_original, existing_file.mime_type)
            return FileUploadResponse(
                is_duplicate=False,
                upload_url=upload_url,
                file_id=existing_file.id,
                s3_key=existing_file.s3_key_original
            )

        #новый файл
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