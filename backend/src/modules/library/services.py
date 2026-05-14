import uuid
from typing import List
from src.infrastructure.db.uow import UnitOfWork
from src.modules.library.repositories import LibraryRepository
from src.modules.library.models import Track, UserStem, UserSavedTrack, UserSavedStem
from src.modules.storage.repositories import FileRepository
from src.modules.processing.repositories.stems import StemRepository
from src.modules.processing.repositories.tasks import TaskRepository
from src.modules.library.schemas import TrackUpdateDTO
from src.infrastructure.s3.presigned import generate_get_url
from src.core.exceptions import NotFoundError, AccessDeniedError
from sqlalchemy import select
from src.modules.processing.models import Stem

async def process_track_ready_event(user_id: str, file_id: str, task_id: str) -> None:
    async with UnitOfWork() as uow:
        file_repo = FileRepository(uow.session)
        
        file_obj = await file_repo.get_by_id(file_id)
        if not file_obj:
            return

        lib_repo = LibraryRepository(uow.session)
        
        track = Track(
            user_id=uuid.UUID(user_id),
            file_id=uuid.UUID(file_id),
            title=file_obj.s3_key_original.split('/')[-1] or "New Track",
            original_filename=file_obj.s3_key_original.split('/')[-1]
        )
        lib_repo.add_track(track)
        await uow.session.flush()

        stmt = select(Stem).where(Stem.task_id == uuid.UUID(task_id))
        result = await uow.session.execute(stmt)
        physical_stems = result.scalars().all()

        user_stems = [
            UserStem(
                user_id=uuid.UUID(user_id),
                stem_id=ps.id,
                track_id=track.id
            ) for ps in physical_stems
        ]
        lib_repo.add_user_stems(user_stems)
        await uow.commit()

async def update_track_metadata(user_id: str, track_id: str, data: TrackUpdateDTO) -> None:
    async with UnitOfWork() as uow:
        repo = LibraryRepository(uow.session)
        track = await repo.get_track_by_id(track_id)
        
        if not track:
            raise NotFoundError("Track not found")
        if str(track.user_id) != user_id:
            raise AccessDeniedError("Access denied")

        if data.title is not None:
            track.title = data.title
        if data.genre is not None:
            track.genre = data.genre
        if data.bpm is not None:
            track.bpm = data.bpm
        if data.tags is not None:
            track.tags = data.tags
        if data.visibility is not None:
            track.visibility = data.visibility

        await uow.commit()

async def get_track_download_url(user_id: str, track_id: str) -> str:
    async with UnitOfWork() as uow:
        lib_repo = LibraryRepository(uow.session)
        file_repo = FileRepository(uow.session)

        track = await lib_repo.get_track_by_id(track_id)
        if not track:
            raise NotFoundError("Track not found")
        
        if str(track.user_id) != user_id and track.visibility.value != "public":
            raise AccessDeniedError("Access denied")

        if not track.file_id:
            raise NotFoundError("Physical file not attached to track")

        file_obj = await file_repo.get_by_id(str(track.file_id))
        
        track.downloads_count += 1
        await uow.commit()

        return await generate_get_url("audio-platform-uploads", file_obj.s3_key_original)