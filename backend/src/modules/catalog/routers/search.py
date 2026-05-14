from fastapi import APIRouter, Depends, Query, status
from src.common.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.catalog.schemas import SearchResultResponse, CatalogTrackResponse
from src.modules.catalog.services import search_catalog, register_track_play

router = APIRouter(prefix="/catalog", tags=["Catalog"])

@router.get("/search", response_model=SearchResultResponse)
async def search(
    q: str = Query(None, description="Search query"),
    genre: str = Query(None, description="Filter by genre"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    items, total = await search_catalog(str(current_user.id), q, genre, page, limit)
    
    response_items = [
        CatalogTrackResponse(
            id=str(t.id),
            user_id=str(t.user_id),
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
            is_saved=is_saved
        ) for t, is_saved in items
    ]
    
    return SearchResultResponse(items=response_items, total=total, page=page, limit=limit)

@router.post("/{track_id}/play", status_code=status.HTTP_200_OK)
async def track_played(track_id: str):
    await register_track_play(track_id)
    return {"status": "ok"}