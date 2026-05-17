from src.infrastructure.db.uow import UnitOfWork
from src.modules.studio.schemas import SessionSaveRequest, SessionLoadResponse, StudioTrackDTO
from src.modules.studio.models import StudioSession, StudioSessionTrack
from src.modules.studio.repositories import StudioRepository
from src.modules.library.repositories import LibraryRepository
from src.core.exceptions import AccessDeniedError, NotFoundError, BusinessRuleError
import uuid

async def save_session_state(user_id: str, session_id: str, data: SessionSaveRequest) -> str:
    async with UnitOfWork() as uow:
        studio_repo = StudioRepository(uow.session)
        lib_repo = LibraryRepository(uow.session)

        for track in data.tracks:
            if track.stem_id:
                user_stem = await lib_repo.get_user_stem_by_id(track.stem_id)
                if not user_stem or (str(user_stem.user_id) != user_id and user_stem.visibility.value == "private"):
                    raise AccessDeniedError(f"Access denied to stem {track.stem_id}")

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
                
            db_tracks.append(StudioSessionTrack(
                session_id=session.id,
                stem_id=uuid.UUID(t.stem_id) if t.stem_id else None,
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

async def load_session_state(user_id: str, session_id: str) -> SessionLoadResponse:
    async with UnitOfWork() as uow:
        repo = StudioRepository(uow.session)
        session = await repo.get_session_by_id(session_id)
        
        if not session:
            raise NotFoundError("Session not found")
        if str(session.user_id) != user_id:
            raise AccessDeniedError("Access denied")

        tracks = await repo.get_session_tracks(session_id)
        
        return SessionLoadResponse(
            id=str(session.id),
            project_name=session.project_name,
            global_settings=session.global_settings or {},
            tracks=[
                StudioTrackDTO(
                    id=str(t.id),
                    stem_id=str(t.stem_id) if t.stem_id else None,
                    file_id=str(t.file_id) if t.file_id else None,
                    track_index=t.track_index,
                    volume=t.volume,
                    pan=t.pan,
                    is_muted=t.is_muted,
                    is_solo=t.is_solo,
                    start_offset_ms=t.start_offset_ms,
                    trim_start_ms=t.trim_start_ms,
                    trim_end_ms=t.trim_end_ms
                ) for t in tracks
            ]
        )