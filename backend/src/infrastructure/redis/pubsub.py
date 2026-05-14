import asyncio
import json
from redis.asyncio import Redis
from src.core.config import settings
from src.infrastructure.transport.ws_manager import ws_manager
from src.core.logger import logger

async def pubsub_listener():
    while True:
        redis = None
        pubsub = None
        try:
            redis = Redis.from_url(settings.REDIS_URL)
            pubsub = redis.pubsub()
            await pubsub.subscribe("system_events")
            
            logger.info("Started Redis Pub/Sub listener on channel 'system_events'")
            
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message is not None and message["type"] == "message":
                    try:
                        data = json.loads(message["data"].decode("utf-8"))
                        user_id = data.get("user_id")
                        payload = data.get("payload")
                        
                        if user_id and payload:
                            await ws_manager.send_personal_message(user_id, payload)
                            
                            if payload.get("event") == "TrackReady" and payload.get("status") == "completed":# Локальный импорт для предотвращения циклических зависимостей
                                from src.modules.library.services import process_track_ready_event
                                
                                file_id = payload.get("file_id")
                                task_id = payload.get("task_id")
                                
                                if file_id and task_id:
                                    await process_track_ready_event(user_id, file_id, task_id)
                                    
                    except Exception as e:
                        logger.error(f"Error processing pubsub message: {e}")
                
                await asyncio.sleep(0.01)
                
        except asyncio.CancelledError:
            logger.info("Redis Pub/Sub listener stopped")
            break
        except Exception as e:
            logger.error(f"Redis Pub/Sub connection error: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)
        finally:
            if pubsub:
                try:
                    await pubsub.unsubscribe("system_events")
                except Exception:
                    pass
            if redis:
                try:
                    await redis.close()
                except Exception:
                    pass