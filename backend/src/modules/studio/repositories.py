from typing import Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.studio.models import StudioSession, StudioSessionTrack

class StudioRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_session_by_id(self, session_id: str) -> Optional[StudioSession]:
        stmt = select(StudioSession).where(StudioSession.id == session_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_session_tracks(self, session_id: str) -> list[StudioSessionTrack]:
        stmt = select(StudioSessionTrack).where(StudioSessionTrack.session_id == session_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    def add_session(self, session: StudioSession) -> None:
        self.session.add(session)

    async def clear_session_tracks(self, session_id: str) -> None:
        stmt = delete(StudioSessionTrack).where(StudioSessionTrack.session_id == session_id)
        await self.session.execute(stmt)

    def add_tracks_bulk(self, tracks: list[StudioSessionTrack]) -> None:
        self.session.add_all(tracks)