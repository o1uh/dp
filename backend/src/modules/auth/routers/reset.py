from fastapi import APIRouter, status
from src.modules.auth.schemas import ForgotPasswordRequest, ResetPasswordRequest
from src.modules.auth.services.reset import initiate_password_reset, confirm_password_reset

router = APIRouter(tags=["Auth"])

@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(data: ForgotPasswordRequest):
    await initiate_password_reset(data.email)
    return {"message": "If the email is registered, a reset link will be sent."}

@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(data: ResetPasswordRequest):
    await confirm_password_reset(data.token, data.new_password)
    return {"message": "Password reset successfully"}