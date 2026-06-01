import asyncio
import json
from redis.asyncio import Redis
from src.core.config import settings
from src.infrastructure.transport.ws_manager import ws_manager
from src.core.logger import logger

async def pubsub_listener():
    logger.info("Initializing Redis Pub/Sub listener task...")
    while True:
        redis = None
        pubsub = None
        try:
            logger.info(f"Connecting to Redis at URL: {settings.REDIS_URL}")
            redis = Redis.from_url(settings.REDIS_URL)
            pubsub = redis.pubsub()
            
            logger.info("Subscribing to channel 'system_events'...")
            await pubsub.subscribe("system_events")
            logger.info("Successfully subscribed to Redis channel 'system_events'")
            
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message is not None:
                    logger.info(f"Raw Pub/Sub message received: {message}")
                    if message["type"] == "message":
                        try:
                            raw_data = message["data"].decode("utf-8")
                            logger.info(f"Decoding Pub/Sub message data payload: {raw_data}")
                            data = json.loads(raw_data)
                            
                            user_id = data.get("user_id")
                            payload = data.get("payload")
                            logger.info(f"Extracted components - User ID: {user_id}, Payload: {payload}")
                            
                            if user_id and payload:
                                logger.info(f"Dispatching personal message to WS manager for User: {user_id}")
                                await ws_manager.send_personal_message(user_id, payload)
                                
                                event_type = payload.get("event")
                                status_type = payload.get("status")
                                task_type = payload.get("task_type")
                                logger.info(f"Event parsing - Type: {event_type}, Status: {status_type}, Task Type: {task_type}")
                                
                                if event_type == "TrackReady" and status_type == "completed":
                                    if task_type != "render":
                                        logger.info("TrackReady completed event detected for non-render task. Importing processing library...")
                                        from src.modules.library.services import process_track_ready_event
                                        
                                        file_id = payload.get("file_id")
                                        task_id = payload.get("task_id")
                                        logger.info(f"Invoking process_track_ready_event for File: {file_id}, Task: {task_id}")
                                        
                                        if file_id and task_id:
                                            await process_track_ready_event(user_id, file_id, task_id)
                                            logger.info(f"process_track_ready_event completed for File: {file_id}")
                                        else:
                                            logger.warning(f"Missing identifiers in payload - File ID: {file_id}, Task ID: {task_id}")
                            else:
                                logger.warning(f"Malformed system event payload. User ID or Payload is missing: {data}")
                                        
                        except Exception as e:
                            logger.error(f"Error parsing or routing system event message: {e}", exc_info=True)
                
                await asyncio.sleep(0.01)
                
        except asyncio.CancelledError:
            logger.warning("Redis Pub/Sub listener task was explicitly cancelled")
            break
        except Exception as e:
            logger.error(f"Redis Pub/Sub listener encountered error: {e}. Attempting reconnect in 5 seconds...", exc_info=True)
            await asyncio.sleep(5)
        finally:
            if pubsub:
                try:
                    logger.info("Unsubscribing from 'system_events' channel and closing pubsub connector...")
                    await pubsub.unsubscribe("system_events")
                except Exception as ex:
                    logger.error(f"Error during pubsub unsubscribe: {ex}")
            if redis:
                try:
                    logger.info("Closing active Redis connection...")
                    await redis.close()
                    logger.info("Redis connection successfully closed.")
                except Exception as ex:
                    logger.error(f"Error during Redis connection close: {ex}")