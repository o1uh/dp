from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

from src.core.health import router as health_router
from src.core.exceptions import AppException
from src.core.handlers import app_exception_handler, integrity_error_handler
from src.core.logger import logger

from src.modules.auth.routers.login import router as login_router
from src.modules.auth.routers.register import router as register_router
from src.modules.auth.routers.reset import router as reset_router
from src.modules.users.routers.profile import router as profile_router
from src.modules.storage.routers.files import router as files_router

app = FastAPI(title="Audio Platform API")

@app.on_event("startup")
async def startup_event():
    logger.info("Application is starting up...")
    
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