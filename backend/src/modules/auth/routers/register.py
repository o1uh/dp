from fastapi import APIRouter, status
from src.modules.users.schemas import UserCreateRequest
from src.modules.users.services.profile import register_user
from src.common.schemas import ErrorResponse

router = APIRouter(tags=["Auth"])

@router.post("/register", status_code=status.HTTP_201_CREATED, responses={422: {"model": ErrorResponse}})
async def register(data: UserCreateRequest):
    await register_user(data)
    return {"message": "User registered successfully"}