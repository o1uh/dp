from fastapi import APIRouter, Depends, status, Query
from typing import Optional
from src.common.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.studio.schemas import SessionSaveRequest, SessionLoadResponse
from src.modules.studio.services.state import save_session_state, load_session_state

router = APIRouter(prefix="/sessions", tags=["Studio"])

@router.post("/{session_id}", status_code=status.HTTP_200_OK)
async def save_session(session_id: str, data: SessionSaveRequest, current_user: User = Depends(get_current_user)):
    await save_session_state(str(current_user.id), session_id, data)
    return {"status": "saved", "session_id": session_id}

@router.get("/{session_id}", response_model=SessionLoadResponse)
async def load_session(
    session_id: str, 
    task_id: Optional[str] = Query(None, description="Filter track stems by specific processing task ID"),
    current_user: User = Depends(get_current_user)
):
    return await load_session_state(str(current_user.id), session_id, task_id)