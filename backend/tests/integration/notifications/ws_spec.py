import pytest
import json
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
from src.main import app
from src.core.security import create_access_token
from src.infrastructure.transport.ws_manager import WebSocketManager

client = TestClient(app)

def test_ws_connection_missing_token():
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/ws/notifications"):
            pass
    assert exc.value.code in [1008, 403]

def test_ws_connection_invalid_token():
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/ws/notifications?token=invalid.token.string") as ws:
            ws.receive_text() 
    assert exc.value.code == 1008

def test_ws_connection_valid_token(setup_roles_and_users):
    user_id, role_id = setup_roles_and_users["b2c_user"]
    token = create_access_token(str(user_id), str(role_id))
    
    with client.websocket_connect(f"/ws/notifications?token={token}") as websocket:
        assert websocket is not None

@pytest.mark.asyncio
async def test_ws_manager_delivery():
    manager = WebSocketManager()
    mock_ws = AsyncMock()
    
    user_id = "test_user_id"
    manager.active_connections[user_id] = [mock_ws]
    
    payload = {
        "event": "TrackReady",
        "task_id": "00000000-0000-0000-0000-000000000000",
        "status": "completed"
    }
    
    await manager.send_personal_message(user_id, payload)
    
    mock_ws.send_text.assert_called_once_with(json.dumps(payload))