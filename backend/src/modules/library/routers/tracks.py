from fastapi import APIRouter, Depends, status, Query
from src.common.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.library.schemas import TrackUpdateDTO, TrackListResponse, TrackResponse, AliasCreateRequest, ProcessedModelInfo
from src.modules.library.services import update_track_metadata, get_track_download_url
from src.infrastructure.db.uow import UnitOfWork
from src.modules.library.repositories import LibraryRepository
from datetime import datetime
from src.modules.library.models import UserSavedTrack
from src.modules.processing.models import ProcessingTask, Stem
from sqlalchemy import select, func
import uuid

router = APIRouter(prefix="/tracks", tags=["Library"])

@router.get("", response_model=TrackListResponse)
async def list_tracks(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    offset = (page - 1) * limit
    async with UnitOfWork() as uow:
        repo = LibraryRepository(uow.session)
        tracks = await repo.get_user_tracks(str(current_user.id), limit, offset)
        total = await repo.get_user_tracks_count(str(current_user.id))

        file_ids = [t.file_id for t in tracks if t.file_id]
        tasks_map = {}
        active_files = set()
        
        if file_ids:
            stmt_active = select(ProcessingTask.file_id).where(
                ProcessingTask.file_id.in_(file_ids),
                ProcessingTask.status.in_(["pending", "processing"]),
                ProcessingTask.user_id == current_user.id
            )
            active_res = await uow.session.execute(stmt_active)
            active_files = {str(f_id) for f_id in active_res.scalars().all()}

            stmt_tasks = (
                select(
                    ProcessingTask.id,
                    ProcessingTask.file_id,
                    ProcessingTask.model_config,
                    ProcessingTask.created_at
                )
                .where(
                    ProcessingTask.file_id.in_(file_ids),
                    ProcessingTask.status == "completed",
                    ProcessingTask.user_id == current_user.id
                )
            )
            tasks_res = await uow.session.execute(stmt_tasks)
            for row in tasks_res.all():
                f_id = str(row.file_id)
                if f_id not in tasks_map:
                    tasks_map[f_id] = []
                
                model_name = row.model_config.get("model", "htdemucs")
                if row.model_config.get("type") == "render":
                    model_name = "render"
                
                if model_name == "cascade_guitar":
                    stem_count = 5
                elif model_name == "render":
                    stem_count = 1
                else:
                    stem_count = 4
                
                tasks_map[f_id].append(
                    ProcessedModelInfo(
                        task_id=str(row.id),
                        model_name=model_name,
                        stem_count=stem_count,
                        created_at=row.created_at
                    )
                )

        items = [
            TrackResponse(
                id=str(t.id),
                user_id=str(t.user_id),
                file_id=str(t.file_id) if t.file_id else None,
                title=t.title,
                original_filename=t.original_filename,
                genre=t.genre,
                bpm=t.bpm,
                tags=t.tags,
                visibility=t.visibility,
                play_count=t.play_count,
                save_count=t.save_count,
                downloads_count=t.downloads_count,
                created_at=t.created_at,
                deleted_at=t.deleted_at,
                processed_models=tasks_map.get(str(t.file_id), []) if t.file_id else [],
                is_processing=str(t.file_id) in active_files if t.file_id else False
            ) for t in tracks
        ]
        
        return TrackListResponse(items=items, total=total, page=page, limit=limit)

@router.put("/{track_id}", status_code=status.HTTP_200_OK)
async def update_track(track_id: str, data: TrackUpdateDTO, current_user: User = Depends(get_current_user)):
    await update_track_metadata(str(current_user.id), track_id, data)
    return {"status": "updated"}

@router.delete("/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_track(track_id: str, current_user: User = Depends(get_current_user)):
    async with UnitOfWork() as uow:
        repo = LibraryRepository(uow.session)
        track = await repo.get_track_by_id(track_id)
        
        if not track:
            from sqlalchemy import delete
            stmt = delete(UserSavedTrack).where(
                UserSavedTrack.user_id == current_user.id,
                UserSavedTrack.track_id == uuid.UUID(track_id)
            )
            await uow.session.execute(stmt)
            await uow.commit()
            return

        if str(track.user_id) == str(current_user.id):
            track.deleted_at = datetime.utcnow()
        else:
            from sqlalchemy import delete
            stmt = delete(UserSavedTrack).where(
                UserSavedTrack.user_id == current_user.id,
                UserSavedTrack.track_id == track.id
            )
            await uow.session.execute(stmt)
            
        await uow.commit()

@router.get("/{track_id}/download")
async def download_track(track_id: str, current_user: User = Depends(get_current_user)):
    url = await get_track_download_url(str(current_user.id), track_id)
    return {"download_url": url}

@router.post("/save-alias", status_code=status.HTTP_201_CREATED)
async def save_track_to_library(data: AliasCreateRequest, current_user: User = Depends(get_current_user)):
    async with UnitOfWork() as uow:
        repo = LibraryRepository(uow.session)
        
        original_track = await repo.get_track_by_id(data.original_id)
        if not original_track or original_track.visibility.value == "private":
            from src.core.exceptions import NotFoundError
            raise NotFoundError("Track not found or private")

        saved_track = UserSavedTrack(
            user_id=current_user.id,
            track_id=original_track.id
        )
        repo.add_saved_track(saved_track)
        
        original_track.save_count += 1
        await uow.commit()
        
    return {"status": "saved"}