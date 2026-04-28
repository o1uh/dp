from fastapi import APIRouter, Depends, status
from src.common.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.storage.schemas import FileUploadRequest, FileUploadResponse, FileConfirmRequest
from src.modules.storage.services import init_upload, confirm_upload

router = APIRouter(prefix="/files", tags=["Storage"])

@router.post("/upload-init", response_model=FileUploadResponse)
async def upload_init(data: FileUploadRequest, current_user: User = Depends(get_current_user)):
    return await init_upload(data)

@router.post("/upload-confirm", status_code=status.HTTP_200_OK)
async def upload_confirm(data: FileConfirmRequest, current_user: User = Depends(get_current_user)):
    await confirm_upload(str(data.file_id))
    return {"message": "Upload confirmed"}