import uuid
from typing import List
from sqlalchemy import select, delete
from src.infrastructure.db.uow import UnitOfWork
from src.modules.library.repositories import LibraryRepository
from src.modules.library.models import Track, UserStem
from src.modules.storage.repositories import FileRepository
from src.modules.library.schemas import TrackUpdateDTO
from src.infrastructure.s3.presigned import generate_get_url
from src.core.exceptions import NotFoundError, AccessDeniedError
from src.modules.processing.models import Stem

async def process_track_ready_event(user_id: str, file_id: str, task_id: str) -> None:
    async with UnitOfWork() as uow:
        file_repo = FileRepository(uow.session)
        
        file_obj = await file_repo.get_by_id(file_id)
        if not file_obj:
            return

        lib_repo = LibraryRepository(uow.session)
        
        stmt_track = select(Track).where(
            Track.user_id == uuid.UUID(user_id),
            Track.file_id == uuid.UUID(file_id),
            Track.deleted_at.is_(None)
        )
        track = (await uow.session.execute(stmt_track)).scalar_one_or_none()

        if not track:
            track = Track(
                user_id=uuid.UUID(user_id),
                file_id=uuid.UUID(file_id),
                title=file_obj.s3_key_original.split('/')[-1] or "New Track",
                original_filename=file_obj.s3_key_original.split('/')[-1]
            )
            lib_repo.add_track(track)
            await uow.session.flush()

        stmt_stems = select(Stem).where(Stem.task_id == uuid.UUID(task_id))
        result = await uow.session.execute(stmt_stems)
        task_stems = result.scalars().all()

        all_linked_stems = list(task_stems)
        linked_classes = {s.stem_class for s in task_stems}

        if len(linked_classes) < 5:
            stmt_all = select(Stem).where(Stem.file_id == uuid.UUID(file_id))
            all_file_stems = (await uow.session.execute(stmt_all)).scalars().all()
            
            for fs in all_file_stems:
                if fs.stem_class not in linked_classes:
                    all_linked_stems.append(fs)
                    linked_classes.add(fs.stem_class)

        stmt_del = delete(UserStem).where(UserStem.track_id == track.id)
        await uow.session.execute(stmt_del)

        user_stems = [
            UserStem(
                user_id=uuid.UUID(user_id),
                stem_id=ps.id,
                track_id=track.id
            ) for ps in all_linked_stems
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