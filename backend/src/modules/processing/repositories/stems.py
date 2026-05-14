from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.processing.models import Stem

class StemRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    def add_bulk(self, stems: List[Stem]) -> None:
        self.session.add_all(stems)