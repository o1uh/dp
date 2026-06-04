import uuid
from typing import Optional
from sqlalchemy import select
from src.infrastructure.db.uow import UnitOfWork
from src.modules.studio.schemas import SessionSaveRequest, SessionLoadResponse, StudioTrackDTO
from src.modules.studio.models import StudioSession, StudioSessionTrack
from src.modules.studio.repositories import StudioRepository
from src.modules.library.repositories import LibraryRepository
from src.modules.library.models import UserStem
from src.modules.processing.models import Stem, ProcessingTask
from src.modules.storage.models import File
from src.common.enums import TaskStatus
from src.core.exceptions import AccessDeniedError, NotFoundError, BusinessRuleError
from src.core.logger import logger

async def save_session_state(user_id: str, session_id: str, data: SessionSaveRequest) -> str:
    logger.info(f"Saving DAW session state. User: {user_id}, Session: {session_id}, Tracks count: {len(data.tracks)}")
    async with UnitOfWork() as uow:
        studio_repo = StudioRepository(uow.session)
        lib_repo = LibraryRepository(uow.session)

        logical_to_physical = {}

        # logger.info("Starting validation of logical stems mapping permissions...")
        for track in data.tracks:
            if track.stem_id:
                # logger.info(f"Resolving logical user stem ID: {track.stem_id}")
                user_stem = await lib_repo.get_user_stem_by_id(track.stem_id)
                if not user_stem:
                    logger.warning(f"Validation failed: Logical stem {track.stem_id} not found")
                    raise AccessDeniedError(f"Access denied to stem {track.stem_id}")

                # logger.info(f"Checking ownership for stem: {track.stem_id}. Owner: {user_stem.user_id}, Requester: {user_id}, Visibility: {user_stem.visibility}")
                if str(user_stem.user_id) != user_id and user_stem.visibility.value == "private":
                    from src.modules.library.models import Track
                    stmt_t = select(Track).where(Track.id == user_stem.track_id)
                    t_obj = (await uow.session.execute(stmt_t)).scalar_one_or_none()
                    if t_obj and t_obj.visibility.value == "public":
                        pass
                    else:
                        logger.warning(f"Validation failed: Private stem {track.stem_id} belongs to another user")
                        raise AccessDeniedError(f"Access denied to stem {track.stem_id}")

                logical_to_physical[track.stem_id] = user_stem.stem_id
                # logger.info(f"Mapped logical stem {track.stem_id} to physical stem: {user_stem.stem_id}")

        # logger.info(f"Querying studio session record: {session_id}")
        session = await studio_repo.get_session_by_id(session_id)

        if not session:
            # logger.info(f"Session {session_id} not found. Creating a new session container...")
            session = StudioSession(
                id=uuid.UUID(session_id),
                user_id=uuid.UUID(user_id),
                project_name=data.project_name,
                global_settings=data.global_settings
            )
            studio_repo.add_session(session)
        else:
            # logger.info(f"Asserting session ownership. Owner: {session.user_id}, Requester: {user_id}")
            if str(session.user_id) != user_id:
                logger.error(f"Access denied: User {user_id} does not own session {session_id}")
                raise AccessDeniedError("Not session owner")

            # logger.info(f"Updating session settings. Title: '{data.project_name}'")
            session.project_name = data.project_name
            session.global_settings = data.global_settings

            # logger.info(f"Clearing old track structures for session: {session_id}")
            await studio_repo.clear_session_tracks(session_id)

        await uow.session.flush()

        db_tracks = []
        # logger.info("Mapping network matrix payload to database track entities...")
        for t in data.tracks:
            if not t.stem_id and not t.file_id:
                logger.error("Validation failed: Track definition missing both stem_id and file_id parameters")
                raise BusinessRuleError("Track must have either stem_id or file_id")

            phys_stem_id = logical_to_physical.get(t.stem_id) if t.stem_id else None

            # logger.info(f"Packing track entity. Index: {t.track_index}, Volume: {t.volume}, Pan: {t.pan}, Stem ID: {phys_stem_id}")
            db_tracks.append(StudioSessionTrack(
                session_id=session.id,
                stem_id=phys_stem_id,
                file_id=uuid.UUID(t.file_id) if t.file_id else None,
                track_index=t.track_index,
                volume=t.volume,
                pan=t.pan,
                is_muted=t.is_muted,
                is_solo=t.is_solo,
                start_offset_ms=t.start_offset_ms,
                trim_start_ms=t.trim_start_ms,
                trim_end_ms=t.trim_end_ms
            ))

        # logger.info(f"Writing {len(db_tracks)} tracks bulk parameters to DB...")
        studio_repo.add_tracks_bulk(db_tracks)
        await uow.commit()
        # logger.info(f"DAW Session state successfully synchronized and committed. Session ID: {session.id}")
        return str(session.id)

async def load_session_state(user_id: str, session_id: str, task_id: Optional[str] = None) -> SessionLoadResponse:
    logger.info(f"Loading session configuration. User: {user_id}, Session ID: {session_id}, Filter Task: {task_id}")
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        logger.error(f"Validation failed: Session ID '{session_id}' has invalid UUID format")
        raise BusinessRuleError("Invalid session ID format")

    async with UnitOfWork() as uow:
        repo = StudioRepository(uow.session)
        # logger.info(f"Querying studio session details: {session_id}")
        session = await repo.get_session_by_id(session_id)

        if session:
            # logger.info(f"Session located. Checking owners. Session Owner: {session.user_id}, Requester: {user_id}")
            if str(session.user_id) != user_id:
                logger.error("Access denied: Requester is not the owner of this session")
                raise AccessDeniedError("Access denied")

            # logger.info(f"Fetching active tracks list for session: {session_id}")
            tracks = await repo.get_session_tracks(session_id)
            track_dtos = []

            # logger.info(f"Mapping {len(tracks)} track parameters to transmission objects...")
            for t in tracks:
                track_name = f"Дорожка {t.track_index + 1}"
                logical_stem_id = None

                if t.stem_id:
                    stem_obj = await uow.session.get(Stem, t.stem_id)
                    if stem_obj:
                        track_name = stem_obj.stem_class.capitalize()

                    # logger.info(f"Resolving logical UserStem mapping for physical stem: {t.stem_id}")
                    stmt = select(UserStem).where(
                        UserStem.stem_id == t.stem_id,
                        UserStem.user_id == uuid.UUID(user_id)
                    )
                    user_stem = (await uow.session.execute(stmt)).scalar_one_or_none()

                    if not user_stem:
                        # logger.info(f"UserStem mapping missing for physical stem {t.stem_id}. Attempting auto-binding recovery...")
                        stmt_track = select(Track).where(Track.file_id == stem_obj.file_id, Track.user_id == uuid.UUID(user_id)).limit(1)
                        track_obj = (await uow.session.execute(stmt_track)).scalar_one_or_none()
                        if track_obj:
                            # logger.info(f"Auto-binding stem {t.stem_id} to Virtual Track profile: {track_obj.id}")
                            user_stem = UserStem(
                                user_id=uuid.UUID(user_id),
                                stem_id=t.stem_id,
                                track_id=track_obj.id
                            )
                            uow.session.add(user_stem)
                            await uow.session.flush()

                    if user_stem:
                        logical_stem_id = str(user_stem.id)

                elif t.file_id:
                    file_obj = await uow.session.get(File, t.file_id)
                    if file_obj:
                        track_name = "Оригинал"

                track_dtos.append(
                    StudioTrackDTO(
                        id=str(t.id),
                        name=track_name,
                        stem_id=logical_stem_id,
                        file_id=str(t.file_id) if t.file_id else None,
                        track_index=t.track_index,
                        volume=t.volume,
                        pan=t.pan,
                        is_muted=t.is_muted,
                        is_solo=t.is_solo,
                        start_offset_ms=t.start_offset_ms,
                        trim_start_ms=t.trim_start_ms,
                        trim_end_ms=t.trim_end_ms
                    )
                )

            # logger.info(f"Session load sequence completed successfully. ID: {session.id}")
            return SessionLoadResponse(
                id=str(session.id),
                project_name=session.project_name,
                global_settings=session.global_settings or {},
                tracks=track_dtos
            )

        # logger.info(f"No custom session state found. Attempting logical initialization from Virtual Track template ID: {session_id}")
        lib_repo = LibraryRepository(uow.session)
        track = await lib_repo.get_track_by_id(session_id)

        if not track:
            logger.error(f"Initialization aborted: Virtual Track profile or Session ID {session_id} not found")
            raise NotFoundError("Session or Track not found")

        if str(track.user_id) != user_id:
            if track.visibility.value == "private":
                logger.error(f"Access denied: Track {track.id} was made private by owner.")
                raise AccessDeniedError("Access denied")

            from src.modules.library.models import UserSavedTrack
            is_public = track.visibility.value == "public"
            stmt_saved = select(UserSavedTrack).where(
                UserSavedTrack.user_id == uuid.UUID(user_id),
                UserSavedTrack.track_id == track.id
            )
            is_saved = (await uow.session.execute(stmt_saved)).scalar_one_or_none() is not None

            if not is_public and not is_saved:
                logger.error(f"Access denied: User {user_id} does not own and has not saved Virtual Track profile: {track.id}")
                raise AccessDeniedError("Access denied")

        target_task_uuid = None
        if task_id:
            target_task_uuid = uuid.UUID(task_id)
            # logger.info(f"Using explicitly specified processing task filter: {target_task_uuid}")
        else:
            # logger.info(f"Finding latest completed processing task for File ID: {track.file_id}")
            stmt_latest = (
                select(ProcessingTask.id)
                .where(
                    ProcessingTask.file_id == track.file_id,
                    ProcessingTask.status == TaskStatus.completed
                )
                .order_by(ProcessingTask.created_at.desc())
                .limit(1)
            )
            target_task_uuid = (await uow.session.execute(stmt_latest)).scalar_one_or_none()
            # logger.info(f"Latest completed task resolved: {target_task_uuid}")

        if not target_task_uuid:
            logger.warning(f"No completed tasks exist for File ID: {track.file_id}. Initializing empty session environment...")
            return SessionLoadResponse(
                id=session_id,
                project_name=f"Mix: {track.title}",
                global_settings={},
                tracks=[]
            )

        stmt_task = select(ProcessingTask).where(ProcessingTask.id == target_task_uuid)
        task_obj = (await uow.session.execute(stmt_task)).scalar_one_or_none()

        model_name = "htdemucs"
        if task_obj and task_obj.model_config:
            model_name = task_obj.model_config.get("model", "htdemucs")
        # logger.info(f"Resolved processing model architecture: '{model_name}'")

        # logger.info(f"Locating user stems linked to track ID: {track.id}")
        stmt_us = select(UserStem).where(UserStem.track_id == track.id)
        user_stems = (await uow.session.execute(stmt_us)).scalars().all()
        user_stem_ids = [us.stem_id for us in user_stems]
        # logger.info(f"User stems found: {len(user_stem_ids)}")

        all_user_stems = []
        if user_stem_ids:
            # logger.info("Resolving physical stems metadata configurations...")
            stmt_stems = select(Stem).where(Stem.id.in_(user_stem_ids))
            all_user_stems = (await uow.session.execute(stmt_stems)).scalars().all()

        stems_to_load = []
        if model_name == "cascade_guitar":
            # logger.info("Processing cascade model filter. Resolving cascade stems hierarchy...")
            for s in all_user_stems:
                if s.stem_class in ["guitar", "other"]:
                    if s.model_version != "HT_Demucs_v4":
                        stems_to_load.append(s)
                else:
                    if s.model_version == "HT_Demucs_v4":
                        stems_to_load.append(s)
        else:
            # logger.info("Processing standard model filter. Querying standard stems version...")
            for s in all_user_stems:
                if s.model_version == "HT_Demucs_v4":
                    stems_to_load.append(s)

        # logger.info(f"Filtered stems list compiled: {len(stems_to_load)} stems to display in DAW workspace")
        track_dtos = []
        for idx, stem_obj in enumerate(stems_to_load):
            user_stem_obj = next((us for us in user_stems if us.stem_id == stem_obj.id), None)
            if not user_stem_obj:
                continue

            track_dtos.append(
                StudioTrackDTO(
                    id=str(uuid.uuid4()),
                    name=stem_obj.stem_class.capitalize(),
                    stem_id=str(user_stem_obj.id),
                    file_id=None,
                    track_index=idx,
                    volume=1.0,
                    pan=0.0,
                    is_muted=False,
                    is_solo=False,
                    start_offset_ms=0,
                    trim_start_ms=0,
                    trim_end_ms=None
                )
            )

        # logger.info(f"DAW Session template loaded and initialized dynamically. Virtual Session: {session_id}")
        return SessionLoadResponse(
            id=session_id,
            project_name=f"Mix: {track.title}",
            global_settings={},
            tracks=track_dtos
        )