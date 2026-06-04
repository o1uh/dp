import asyncio
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
import aioboto3

from src.infrastructure.db.session import engine
from src.infrastructure.db.base import Base

from src.core.health import router as health_router
from src.core.exceptions import AppException
from src.core.handlers import app_exception_handler, integrity_error_handler
from src.core.logger import logger
from src.core.config import settings

from src.modules.auth.routers.login import router as login_router
from src.modules.auth.routers.register import router as register_router
from src.modules.auth.routers.reset import router as reset_router
from src.modules.users.routers.profile import router as profile_router
from src.modules.storage.routers.files import router as files_router

from src.modules.processing.routers.tasks import router as tasks_router
from src.modules.processing.routers.webhooks import router as webhooks_router
from src.modules.notifications.routers.rest import router as notif_rest_router
from src.modules.notifications.routers.ws import router as notif_ws_router
from src.infrastructure.redis.pubsub import pubsub_listener

from src.modules.library.routers.tracks import router as tracks_router
from src.modules.library.routers.stems import router as stems_router

from src.modules.catalog.routers.search import router as catalog_router

from src.modules.studio.routers.sessions import router as studio_sessions_router
from src.modules.studio.routers.exports import router as studio_exports_router

app = FastAPI(title="Audio Platform API")

@app.middleware("http")
async def global_http_logging_middleware(request: Request, call_next):
    # request_id = str(uuid.uuid4()) if 'uuid' in globals() else str(time.time())
    # client_ip = request.client.host if request.client else "unknown"
    # logger.info(f"[GLOBAL HTTP INBOUND] [{request_id}] Client: {client_ip}, Method: {request.method}, URL Path: {request.url.path}, Query Parameters: {request.query_params}")

    start_time = time.time()
    try:
        response = await call_next(request)
        # duration_ms = (time.time() - start_time) * 1000
        # logger.info(f"[GLOBAL HTTP OUTBOUND] [{request_id}] Client: {client_ip}, Method: {request.method}, URL Path: {request.url.path}, Status: {response.status_code}, Processing Time: {duration_ms:.2f}ms")
        return response
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"[GLOBAL HTTP EXCEPTION] failed with Exception after {duration_ms:.2f}ms. Error: {e}", exc_info=True)
        raise

@app.on_event("startup")
async def startup_event():
    logger.info("[STARTUP] Application startup sequence triggered...")

    try:
        # logger.info("[STARTUP] Checking and verifying database connection schema...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("[STARTUP] Database connection established. Tables verified successfully.")
    except Exception as e:
        logger.error(f"[STARTUP ERROR] Critical failure mapping schema: {e}", exc_info=True)

    try:
        # logger.info(f"[STARTUP] Initializing S3 connection to bucket. Target Endpoint: {settings.S3_ENDPOINT}")
        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
        ) as s3:
            try:
                await s3.head_bucket(Bucket="audio-platform-uploads")
                # logger.info("[STARTUP] Verified existing target uploads bucket 'audio-platform-uploads' on S3.")
            except Exception:
                # logger.info("[STARTUP] Uploads bucket 'audio-platform-uploads' missing. Dispatching creation call...")
                await s3.create_bucket(Bucket="audio-platform-uploads")
                logger.info("[STARTUP] Bucket 'audio-platform-uploads' successfully initialized.")
    except Exception as e:
        logger.error(f"[STARTUP ERROR] Critical failure during S3 bucket lookup: {e}", exc_info=True)

    # logger.info("[STARTUP] Spawning Redis Pub/Sub asynchronous event worker listener thread...")
    asyncio.create_task(pubsub_listener())
    # logger.info("[STARTUP] Application startup sequence finished successfully.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)

# Healthcheck
app.include_router(health_router, prefix="/api")

# Auth & Users
app.include_router(login_router, prefix="/api/auth")
app.include_router(register_router, prefix="/api/auth")
app.include_router(reset_router, prefix="/api/auth")
app.include_router(profile_router, prefix="/api/users")

# Storage
app.include_router(files_router, prefix="/api")

# Processing & Notifications
app.include_router(tasks_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(notif_rest_router, prefix="/api")
app.include_router(notif_ws_router)

# Library & Catalog
app.include_router(tracks_router, prefix="/api")
app.include_router(stems_router, prefix="/api")
app.include_router(catalog_router, prefix="/api")

# Studio
app.include_router(studio_sessions_router, prefix="/api")
app.include_router(studio_exports_router, prefix="/api")