from typing import Tuple, List
from src.infrastructure.db.uow import UnitOfWork
from src.modules.catalog.repositories import CatalogRepository
from src.modules.library.models import Track

async def search_catalog(query: str, genre: str, page: int, limit: int) -> Tuple[List[Track], int]:
    offset = (page - 1) * limit
    async with UnitOfWork() as uow:
        repo = CatalogRepository(uow.session)
        items, total = await repo.search_public_tracks(query, genre, limit, offset)
        return items, total

async def register_track_play(track_id: str) -> None:
    async with UnitOfWork() as uow:
        repo = CatalogRepository(uow.session)
        await repo.increment_play_count(track_id)
        await uow.commit()