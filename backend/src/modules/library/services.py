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

        stmt_all = select(Stem).where(Stem.file_id == uuid.UUID(file_id))
        all_file_stems = (await uow.session.execute(stmt_all)).scalars().all()

        stmt_existing = select(UserStem.stem_id).where(UserStem.track_id == track.id)
        existing_stem_ids = set((await uow.session.execute(stmt_existing)).scalars().all())

        user_stems = [
            UserStem(
                user_id=uuid.UUID(user_id),
                stem_id=ps.id,
                track_id=track.id
            ) for ps in all_file_stems if ps.id not in existing_stem_ids
        ]
        
        if user_stems:
            lib_repo.add_user_stems(user_stems)

        from src.modules.studio.models import StudioSession, StudioSessionTrack
        
        stmt_session = select(StudioSession).where(StudioSession.id == track.id)
        session_obj = (await uow.session.execute(stmt_session)).scalar_one_or_none()
        
        if session_obj:
            stmt_curr_tracks = select(StudioSessionTrack).where(StudioSessionTrack.session_id == session_obj.id)
            curr_tracks = (await uow.session.execute(stmt_curr_tracks)).scalars().all()
            
            class_to_track = {}
            for t in curr_tracks:
                if t.stem_id:
                    stem_info = await uow.session.get(Stem, t.stem_id)
                    if stem_info:
                        class_to_track[stem_info.stem_class] = t

            max_index = max([t.track_index for t in curr_tracks]) if curr_tracks else -1
            
            for ps in all_file_stems:
                if ps.stem_class in class_to_track:
                    class_to_track[ps.stem_class].stem_id = ps.id
                else:
                    max_index += 1
                    new_session_track = StudioSessionTrack(
                        session_id=session_obj.id,
                        stem_id=ps.id,
                        file_id=None,
                        track_index=max_index,
                        volume=1.0,
                        pan=0.0,
                        is_muted=False,
                        is_solo=False,
                        start_offset_ms=0,
                        trim_start_ms=0,
                        trim_end_ms=None
                    )
                    uow.session.add(new_session_track)

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