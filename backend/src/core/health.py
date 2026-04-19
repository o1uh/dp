from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from src.infrastructure.db.session import async_session_maker
from src.core.config import settings
import redis.asyncio as redis
import aioboto3

router = APIRouter(prefix="/health", tags=["system"])

@router.get("/liveness")
async def liveness():
    return {"status": "ok"}

@router.get("/readiness")
async def readiness():
    # Проверка БД
    try:
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB error: {str(e)}")

    # Проверка Redis
    try:
        r = redis.from_url(settings.REDIS_URL)
        await r.ping()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Redis error: {str(e)}")

    # Проверка S3
    try:
        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
        ) as s3:
            await s3.list_buckets()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"S3 error: {str(e)}")

    return {"status": "ok"}