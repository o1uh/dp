from typing import Generic, TypeVar, List
from pydantic import BaseModel

T = TypeVar('T')

class ErrorResponse(BaseModel):
    error_code: str
    message: str

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    limit: int