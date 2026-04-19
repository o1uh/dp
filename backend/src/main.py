from fastapi import FastAPI
from src.core.health import router as health_router

app = FastAPI(title="Audio Platform API")

app.include_router(health_router, prefix="/api")