import asyncio
from fastapi import FastAPI
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

app = FastAPI(title="Audio Platform API")

@app.on_event("startup")
async def startup_event():
    logger.info("Application is starting up...")
    
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified/created successfully.")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")

    try:
        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
        ) as s3:
            try:
                await s3.head_bucket(Bucket="audio-platform-uploads")
            except Exception:
                await s3.create_bucket(Bucket="audio-platform-uploads")
                logger.info("Bucket 'audio-platform-uploads' created successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize S3 bucket: {e}")
        
    asyncio.create_task(pubsub_listener())

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