from fastapi import APIRouter, Depends, Query, status
from src.common.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.catalog.schemas import SearchResultResponse, CatalogTrackResponse
from src.modules.catalog.services import search_catalog, register_track_play
from src.modules.library.schemas import ProcessedModelInfo
from src.modules.processing.models import ProcessingTask
from src.infrastructure.db.uow import UnitOfWork
from sqlalchemy import select
import uuid

router = APIRouter(prefix="/catalog", tags=["Catalog"])

def _resolve_stem_count(model_name: str) -> int:
    if model_name == "cascade_guitar":
        return 5
    if model_name == "render":
        return 1
    return 4

@router.get("/search", response_model=SearchResultResponse)
async def search(
    q: str = Query(None, description="Search query"),
    genre: str = Query(None, description="Filter by genre"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    items, total = await search_catalog(str(current_user.id), q, genre, page, limit)
    
    tasks_map: dict[str, list[ProcessedModelInfo]] = {}
    file_ids = [t.file_id for t, _ in items if t.file_id]
    owner_ids = list({t.user_id for t, _ in items if t.file_id})
    
    if file_ids and owner_ids:
        async with UnitOfWork() as uow:
            stmt_tasks = (
                select(
                    ProcessingTask.id,
                    ProcessingTask.file_id,
                    ProcessingTask.model_config,
                    ProcessingTask.created_at,
                )
                .where(
                    ProcessingTask.file_id.in_(file_ids),
                    ProcessingTask.status == "completed",
                    ProcessingTask.user_id.in_(owner_ids),
                )
            )
            tasks_res = await uow.session.execute(stmt_tasks)
            
            temp_map: dict[tuple[str, str], dict] = {}
            for row in tasks_res.all():
                f_id = str(row.file_id)
                model_name = row.model_config.get("model", "htdemucs")
                if row.model_config.get("type") == "render":
                    model_name = "render"
                key = (f_id, model_name)
                if key not in temp_map or row.created_at > temp_map[key]["created_at"]:
                    temp_map[key] = {
                        "id": str(row.id),
                        "model_name": model_name,
                        "created_at": row.created_at,
                    }
            
            for (f_id, model_name), val in temp_map.items():
                tasks_map.setdefault(f_id, []).append(
                    ProcessedModelInfo(
                        task_id=val["id"],
                        model_name=model_name,
                        stem_count=_resolve_stem_count(model_name),
                        created_at=val["created_at"],
                    )
                )
    
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
            is_saved=is_saved,
            processed_models=tasks_map.get(str(t.file_id), []) if t.file_id else [],
        ) for t, is_saved in items
    ]
    
    return SearchResultResponse(items=response_items, total=total, page=page, limit=limit)

@router.post("/{track_id}/play", status_code=status.HTTP_200_OK)
async def track_played(track_id: str):
    await register_track_play(track_id)
    return {"status": "ok"}