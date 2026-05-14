from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.library.models import Track, UserStem, UserSavedTrack, UserSavedStem
from src.common.enums import VisibilityStatus

class LibraryRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_tracks(self, user_id: str, limit: int = 20, offset: int = 0) -> List[Track]:
        stmt = (
            select(Track)
            .where(Track.user_id == user_id, Track.deleted_at.is_(None))
            .order_by(Track.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_user_tracks_count(self, user_id: str) -> int:
        stmt = select(func.count(Track.id)).where(Track.user_id == user_id, Track.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def get_track_by_id(self, track_id: str) -> Optional[Track]:
        stmt = select(Track).where(Track.id == track_id, Track.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_stem_by_id(self, stem_id: str) -> Optional[UserStem]:
        stmt = select(UserStem).where(UserStem.id == stem_id, UserStem.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def add_track(self, track: Track) -> None:
        self.session.add(track)

    def add_user_stems(self, stems: List[UserStem]) -> None:
        self.session.add_all(stems)

    def add_saved_track(self, saved_track: UserSavedTrack) -> None:
        self.session.add(saved_track)

    def add_saved_stem(self, saved_stem: UserSavedStem) -> None:
        self.session.add(saved_stem)