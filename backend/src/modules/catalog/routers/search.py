from fastapi import APIRouter, Depends, Query, status
from src.modules.library.schemas import TrackResponse
from src.modules.catalog.schemas import SearchResultResponse
from src.modules.catalog.services import search_catalog, register_track_play

router = APIRouter(prefix="/catalog", tags=["Catalog"])

@router.get("/search", response_model=SearchResultResponse)
async def search(
    q: str = Query(None, description="Search query"),
    genre: str = Query(None, description="Filter by genre"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    items, total = await search_catalog(q, genre, page, limit)
    
    response_items = [
        TrackResponse(
            id=str(t.id),
            title=t.title,
            original_filename=t.original_filename,
            genre=t.genre,
            bpm=t.bpm,
            tags=t.tags,
            visibility=t.visibility,
            play_count=t.play_count,
            save_count=t.save_count,
            downloads_count=t.downloads_count,
            created_at=t.created_at
        ) for t in items
    ]
    
    return SearchResultResponse(items=response_items, total=total, page=page, limit=limit)

@router.post("/{track_id}/play", status_code=status.HTTP_200_OK)
async def track_played(track_id: str):
    await register_track_play(track_id)
    return {"status": "ok"}