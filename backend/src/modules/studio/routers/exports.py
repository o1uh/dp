from fastapi import APIRouter, Depends, status
from src.common.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.studio.services.render import initiate_render

router = APIRouter(prefix="/sessions", tags=["Studio"])

@router.post("/{session_id}/export", status_code=status.HTTP_202_ACCEPTED)
async def export_session(session_id: str, current_user: User = Depends(get_current_user)):
    task_id = await initiate_render(str(current_user.id), session_id)
    return {"task_id": task_id, "status": "processing"}