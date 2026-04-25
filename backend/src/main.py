from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

from src.core.health import router as health_router
from src.core.exceptions import AppException
from src.core.handlers import app_exception_handler, integrity_error_handler
from src.core.logger import logger

app = FastAPI(title="Audio Platform API")

@app.on_event("startup")
async def startup_event():
    logger.info("Application is starting up...")
    
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)

app.include_router(health_router, prefix="/api")