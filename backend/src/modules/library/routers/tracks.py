from fastapi import APIRouter, Depends, status, Query
from src.common.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.library.schemas import TrackUpdateDTO, TrackListResponse, TrackResponse, AliasCreateRequest
from src.modules.library.services import update_track_metadata, get_track_download_url
from src.infrastructure.db.uow import UnitOfWork
from src.modules.library.repositories import LibraryRepository
from datetime import datetime

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

        items = [
            TrackResponse(
                id=str(t.id),
                title=t.title,
                original_filename=t.original_filename,
                genre=t.genre,
                bpm=t.bpm,
                tags=t.tags,
                visibility=t.visibility,
                play_count=t.play_count,
                downloads_count=t.downloads_count,
                created_at=t.created_at
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
        if track and str(track.user_id) == str(current_user.id):
            track.deleted_at = datetime.utcnow()
            await uow.commit()

@router.get("/{track_id}/download")
async def download_track(track_id: str, current_user: User = Depends(get_current_user)):
    url = await get_track_download_url(str(current_user.id), track_id)
    return {"download_url": url}