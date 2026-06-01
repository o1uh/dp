import json
from typing import Dict, List
from fastapi import WebSocket
from src.core.security import decode_token
from src.core.logger import logger

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        logger.info("[WS MANAGER] WebSocketManager successfully instantiated.")

    async def connect(self, websocket: WebSocket, token: str) -> str:
        logger.info("[WS MANAGER] Processing new connection request...")
        await websocket.accept()
        try:
            logger.info("Decoding authorization token in connection request...")
            payload = decode_token(token)
            user_id = payload.get("sub")
            if not user_id:
                logger.error("[WS MANAGER CONNECTION FAILED] Missing subject 'sub' claim inside token payload")
                raise ValueError("Invalid token payload")
            
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
            logger.info(f"[WS MANAGER SUCCESS] Connection registered for User ID: {user_id}. Active user socket count: {len(self.active_connections[user_id])}")
            return user_id
        except Exception as e:
            logger.error(f"[WS MANAGER CONNECTION FAILED] Authentication failed during handshake: {e}", exc_info=True)
            await websocket.close(code=1008)
            return None

    def disconnect(self, websocket: WebSocket, user_id: str):
        logger.info(f"[WS MANAGER DISCONNECT] Explicit disconnect request received. User ID: {user_id}")
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
                logger.info(f"[WS MANAGER DISCONNECT] Socket removed. Remaining active sockets for User: {user_id}: {len(self.active_connections[user_id])}")
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                logger.info(f"[WS MANAGER DISCONNECT] No remaining sockets. Cleared User ID key '{user_id}' from registry.")

    async def send_personal_message(self, user_id: str, message: dict):
        logger.info(f"[WS MANAGER TRANSMISSION] Dispatching message payload to User ID: {user_id}. Payload: {message}")
        if user_id in self.active_connections:
            disconnected = []
            logger.info(f"[WS MANAGER TRANSMISSION] Iterating over {len(self.active_connections[user_id])} active sockets for User ID: {user_id}...")
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                    logger.info(f"[WS MANAGER TRANSMISSION SUCCESS] Payload successfully written to socket: {id(connection)}")
                except Exception as ex:
                    logger.error(f"[WS MANAGER TRANSMISSION ERROR] Failed to write data to socket: {id(connection)}. Queueing for cleanup...", exc_info=True)
                    disconnected.append(connection)
            
            for conn in disconnected:
                self.disconnect(conn, user_id)
        else:
            logger.warning(f"[WS MANAGER TRANSMISSION WARNING] Transmission aborted. User ID '{user_id}' has no active websocket registrations.")

ws_manager = WebSocketManager()