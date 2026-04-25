from fastapi import APIRouter, status
from src.modules.auth.schemas import LoginRequest, TokenResponse, RefreshRequest
from src.modules.auth.services.jwt import authenticate_user, refresh_user_token, logout_user

router = APIRouter(tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    return await authenticate_user(data)

@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest):
    return await refresh_user_token(data.refresh_token)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(data: RefreshRequest):
    await logout_user(data.refresh_token)