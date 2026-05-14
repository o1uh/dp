from fastapi import APIRouter, WebSocket, Query
from src.infrastructure.transport.ws_manager import ws_manager

router = APIRouter(tags=["Notifications"])

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    user_id = await ws_manager.connect(websocket, token)
    if not user_id:
        return
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        ws_manager.disconnect(websocket, user_id)