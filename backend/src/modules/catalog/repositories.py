from typing import List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.library.models import Track
from src.common.enums import VisibilityStatus

class CatalogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def search_public_tracks(
        self, 
        query: str = None, 
        genre: str = None, 
        limit: int = 20, 
        offset: int = 0
    ) -> Tuple[List[Track], int]:
        
        base_stmt = select(Track).where(
            Track.visibility == VisibilityStatus.public,
            Track.deleted_at.is_(None)
        )

        if query:
            formatted_query = ' | '.join(query.split())
            base_stmt = base_stmt.where(
                or_(
                    Track.search_vector.op('@@')(func.to_tsquery('simple', formatted_query)),
                    Track.title.ilike(f"%{query}%")
                )
            )

        if genre:
            base_stmt = base_stmt.where(Track.genre.ilike(f"%{genre}%"))

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = base_stmt.order_by(Track.play_count.desc(), Track.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def increment_play_count(self, track_id: str) -> None:
        stmt = select(Track).where(Track.id == track_id)
        result = await self.session.execute(stmt)
        track = result.scalar_one_or_none()
        if track:
            track.play_count += 1