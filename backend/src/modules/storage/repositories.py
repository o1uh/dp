from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.storage.models import File
from src.common.enums import FileProcessingStatus

class FileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_hash(self, file_hash: str) -> Optional[File]:
        stmt = select(File).where(File.file_hash == file_hash)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, file_id: str) -> Optional[File]:
        stmt = select(File).where(File.id == file_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def add(self, file_obj: File) -> None:
        self.session.add(file_obj)