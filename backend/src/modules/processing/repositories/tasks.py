from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.processing.models import ProcessingTask

class TaskRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, task_id: str) -> Optional[ProcessingTask]:
        stmt = select(ProcessingTask).where(ProcessingTask.id == task_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def add(self, task: ProcessingTask) -> None:
        self.session.add(task)