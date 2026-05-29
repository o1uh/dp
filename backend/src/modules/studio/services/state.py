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

async def save_session_state(user_id: str, session_id: str, data: SessionSaveRequest) -> str:
    async with UnitOfWork() as uow:
        studio_repo = StudioRepository(uow.session)
        lib_repo = LibraryRepository(uow.session)

        logical_to_physical = {}

        for track in data.tracks:
            if track.stem_id:
                user_stem = await lib_repo.get_user_stem_by_id(track.stem_id)
                if not user_stem or (str(user_stem.user_id) != user_id and user_stem.visibility.value == "private"):
                    raise AccessDeniedError(f"Access denied to stem {track.stem_id}")
                logical_to_physical[track.stem_id] = user_stem.stem_id

        session = await studio_repo.get_session_by_id(session_id)
        
        if not session:
            session = StudioSession(
                id=uuid.UUID(session_id),
                user_id=uuid.UUID(user_id),
                project_name=data.project_name,
                global_settings=data.global_settings
            )
            studio_repo.add_session(session)
        else:
            if str(session.user_id) != user_id:
                raise AccessDeniedError("Not session owner")
            session.project_name = data.project_name
            session.global_settings = data.global_settings
            await studio_repo.clear_session_tracks(session_id)

        await uow.session.flush()

        db_tracks = []
        for t in data.tracks:
            if not t.stem_id and not t.file_id:
                raise BusinessRuleError("Track must have either stem_id or file_id")
                
            phys_stem_id = logical_to_physical.get(t.stem_id) if t.stem_id else None

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
        
        studio_repo.add_tracks_bulk(db_tracks)
        await uow.commit()
        return str(session.id)

async def load_session_state(user_id: str, session_id: str, task_id: Optional[str] = None) -> SessionLoadResponse:
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise BusinessRuleError("Invalid session ID format")

    async with UnitOfWork() as uow:
        repo = StudioRepository(uow.session)
        session = await repo.get_session_by_id(session_id)
        
        if session:
            if str(session.user_id) != user_id:
                raise AccessDeniedError("Access denied")

            tracks = await repo.get_session_tracks(session_id)
            track_dtos = []
            
            for t in tracks:
                track_name = f"Дорожка {t.track_index + 1}"
                logical_stem_id = None
                
                if t.stem_id:
                    stem_obj = await uow.session.get(Stem, t.stem_id)
                    if stem_obj:
                        track_name = stem_obj.stem_class.capitalize()
                    
                    stmt = select(UserStem).where(
                        UserStem.stem_id == t.stem_id,
                        UserStem.user_id == uuid.UUID(user_id)
                    )
                    user_stem = (await uow.session.execute(stmt)).scalar_one_or_none()
                    if not user_stem:
                        stmt_track = select(Track).where(Track.file_id == stem_obj.file_id, Track.user_id == uuid.UUID(user_id)).limit(1)
                        track_obj = (await uow.session.execute(stmt_track)).scalar_one_or_none()
                        if track_obj:
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
            
            return SessionLoadResponse(
                id=str(session.id),
                project_name=session.project_name,
                global_settings=session.global_settings or {},
                tracks=track_dtos
            )
            
        lib_repo = LibraryRepository(uow.session)
        track = await lib_repo.get_track_by_id(session_id)
        
        if not track:
            raise NotFoundError("Session or Track not found")
        if str(track.user_id) != user_id:
            raise AccessDeniedError("Access denied")

        target_task_uuid = None
        if task_id:
            target_task_uuid = uuid.UUID(task_id)
        else:
            stmt_latest = (
                select(ProcessingTask.id)
                .where(
                    ProcessingTask.file_id == track.file_id, 
                    ProcessingTask.status == TaskStatus.completed,
                    ProcessingTask.user_id == uuid.UUID(user_id)
                )
                .order_by(ProcessingTask.created_at.desc())
                .limit(1)
            )
            target_task_uuid = (await uow.session.execute(stmt_latest)).scalar_one_or_none()

        if not target_task_uuid:
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

        stmt_us = select(UserStem).where(UserStem.track_id == track.id)
        user_stems = (await uow.session.execute(stmt_us)).scalars().all()
        user_stem_ids = [us.stem_id for us in user_stems]

        all_user_stems = []
        if user_stem_ids:
            stmt_stems = select(Stem).where(Stem.id.in_(user_stem_ids))
            all_user_stems = (await uow.session.execute(stmt_stems)).scalars().all()

        stems_to_load = []
        if model_name == "cascade_guitar":
            for s in all_user_stems:
                if s.stem_class in ["guitar", "other"]:
                    if s.model_version != "HT_Demucs_v4":
                        stems_to_load.append(s)
                else:
                    if s.model_version == "HT_Demucs_v4":
                        stems_to_load.append(s)
        else:
                if s.model_version == "HT_Demucs_v4":
                    stems_to_load.append(s)

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
            
        return SessionLoadResponse(
            id=session_id, 
            project_name=f"Mix: {track.title}",
            global_settings={},
            tracks=track_dtos
        )