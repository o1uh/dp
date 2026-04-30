import asyncio
import json
from redis.asyncio import Redis
from src.core.config import settings
from src.infrastructure.transport.ws_manager import ws_manager
from src.core.logger import logger

async def pubsub_listener():
    redis = Redis.from_url(settings.REDIS_URL)
    pubsub = redis.pubsub()
    await pubsub.subscribe("system_events")
    
    logger.info("Started Redis Pub/Sub listener on channel 'system_events'")
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"].decode("utf-8"))
                user_id = data.get("user_id")
                payload = data.get("payload")
                
                if user_id and payload:
                    await ws_manager.send_personal_message(user_id, payload)
    except asyncio.CancelledError:
        logger.info("Redis Pub/Sub listener stopped")
    finally:
        await pubsub.unsubscribe("system_events")
        await redis.close()