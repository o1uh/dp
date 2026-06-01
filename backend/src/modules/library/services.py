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
from src.core.logger import logger

async def process_track_ready_event(user_id: str, file_id: str, task_id: str) -> None:
    logger.info(f"Inventory event triggered: TrackReady. Linking assets... User: {user_id}, File: {file_id}, Task: {task_id}")
    async with UnitOfWork() as uow:
        file_repo = FileRepository(uow.session)
        
        file_obj = await file_repo.get_by_id(file_id)
        if not file_obj:
            logger.error(f"Inventory task aborted: Physical file ID {file_id} missing from catalog records")
            return

        lib_repo = LibraryRepository(uow.session)
        
        logger.info(f"Searching for existing Virtual Track configurations matching criteria: File: {file_id}, User: {user_id}")
        stmt_track = select(Track).where(
            Track.user_id == uuid.UUID(user_id),
            Track.file_id == uuid.UUID(file_id),
            Track.deleted_at.is_(None)
        )
        track = (await uow.session.execute(stmt_track)).scalar_one_or_none()

        if not track:
            logger.info("Virtual Track record is missing. Creating new user track entry...")
            track = Track(
                user_id=uuid.UUID(user_id),
                file_id=uuid.UUID(file_id),
                title=file_obj.s3_key_original.split('/')[-1] or "New Track",
                original_filename=file_obj.s3_key_original.split('/')[-1]
            )
            lib_repo.add_track(track)
            await uow.session.flush()
            logger.info(f"Virtual Track profile successfully established with ID: {track.id}")

        logger.info(f"Fetching physical stems metadata associated with File ID: {file_id}")
        stmt_all = select(Stem).where(Stem.file_id == uuid.UUID(file_id))
        all_file_stems = (await uow.session.execute(stmt_all)).scalars().all()
        logger.info(f"Physical stems found in catalog: {len(all_file_stems)}")

        logger.info(f"Querying current stems mappings for Virtual Track ID: {track.id}")
        stmt_existing = select(UserStem.stem_id).where(UserStem.track_id == track.id)
        existing_stem_ids = set((await uow.session.execute(stmt_existing)).scalars().all())

        logger.info("Mapping unlinked physical stems to user library container...")
        user_stems = [
            UserStem(
                user_id=uuid.UUID(user_id),
                stem_id=ps.id,
                track_id=track.id
            ) for ps in all_file_stems if ps.id not in existing_stem_ids
        ]
        
        if user_stems:
            logger.info(f"Writing {len(user_stems)} new Virtual UserStem relationships to DB...")
            lib_repo.add_user_stems(user_stems)

        from src.modules.studio.models import StudioSession, StudioSessionTrack
        
        logger.info(f"Verifying whether a studio session configuration is active for ID: {track.id}")
        stmt_session = select(StudioSession).where(StudioSession.id == track.id)
        session_obj = (await uow.session.execute(stmt_session)).scalar_one_or_none()
        
        if session_obj:
            logger.info(f"Active studio session located. Synchronizing timeline tracks layout...")
            stmt_curr_tracks = select(StudioSessionTrack).where(StudioSessionTrack.session_id == session_obj.id)
            curr_tracks = (await uow.session.execute(stmt_curr_tracks)).scalars().all()
            
            class_to_track = {}
            for t in curr_tracks:
                if t.stem_id:
                    stem_info = await uow.session.get(Stem, t.stem_id)
                    if stem_info:
                        class_to_track[stem_info.stem_class] = t

            max_index = max([t.track_index for t in curr_tracks]) if curr_tracks else -1
            logger.info(f"Timeline track layout properties resolved: Total tracks: {len(curr_tracks)}, Max track index: {max_index}")
            
            for ps in all_file_stems:
                if ps.stem_class in class_to_track:
                    logger.info(f"Updating existing track references. Class: {ps.stem_class}, Updating to Stem ID: {ps.id}")
                    class_to_track[ps.stem_class].stem_id = ps.id
                else:
                    max_index += 1
                    logger.info(f"Creating new mixer channel track. Index: {max_index}, Class: {ps.stem_class}, Stem ID: {ps.id}")
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
        logger.info(f"Virtual Track profile and stems successfully mapped on system assets database records. Track ID: {track.id}")

async def update_track_metadata(user_id: str, track_id: str, data: TrackUpdateDTO) -> None:
    logger.info(f"Updating Virtual Track metadata. User: {user_id}, Track: {track_id}")
    async with UnitOfWork() as uow:
        repo = LibraryRepository(uow.session)
        track = await repo.get_track_by_id(track_id)
        
        if not track:
            logger.error(f"Metadata update failed: Virtual Track profile {track_id} not found in database")
            raise NotFoundError("Track not found")
            
        logger.info(f"Verifying owner permissions. Owner ID: {track.user_id}, Requester: {user_id}")
        if str(track.user_id) != user_id:
            logger.error("Metadata update aborted: Access denied")
            raise AccessDeniedError("Access denied")

        logger.info(f"Applying metadata updates - Title: '{data.title}', Genre: '{data.genre}', Visibility: '{data.visibility}'")
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
        logger.info(f"Virtual Track {track_id} metadata updated successfully.")

async def get_track_download_url(user_id: str, track_id: str) -> str:
    logger.info(f"Secure download request received. User: {user_id}, Track: {track_id}")
    async with UnitOfWork() as uow:
        lib_repo = LibraryRepository(uow.session)
        file_repo = FileRepository(uow.session)

        logger.info(f"Querying Virtual Track catalog records: {track_id}")
        track = await lib_repo.get_track_by_id(track_id)
        if not track:
            logger.error(f"Download link generation aborted: Track {track_id} not found")
            raise NotFoundError("Track not found")
        
        logger.info(f"Validating access permissions. Visibility: {track.visibility}, Owner: {track.user_id}, Requester: {user_id}")
        if str(track.user_id) != user_id and track.visibility.value != "public":
            logger.error("Download link generation aborted: Access denied")
            raise AccessDeniedError("Access denied")

        if not track.file_id:
            logger.error(f"Download link generation aborted: No physical file container attached to Track ID: {track_id}")
            raise NotFoundError("Physical file not attached to track")

        logger.info(f"Resolving physical file profile matching ID: {track.file_id}")
        file_obj = await file_repo.get_by_id(str(track.file_id))
        
        logger.info(f"Incrementing track downloads counter. Previous value: {track.downloads_count}")
        track.downloads_count += 1
        await uow.commit()

        logger.info(f"Requesting GET presigned URL for S3 key: {file_obj.s3_key_original}")
        url = await generate_get_url("audio-platform-uploads", file_obj.s3_key_original)
        logger.info(f"Download link generated successfully.")
        return url