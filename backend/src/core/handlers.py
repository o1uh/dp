from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from src.core.exceptions import AppException
from src.common.schemas import ErrorResponse
from src.core.logger import logger

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    logger.error(f"[GLOBAL EXCEPTION HANDLER] AppException caught. Path: {request.url.path}, Error Code: {exc.error_code}, Status: {exc.status_code}, Message: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(error_code=exc.error_code, message=exc.message).model_dump()
    )

async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    logger.error(f"[GLOBAL EXCEPTION HANDLER] SQLAlchemy IntegrityError caught. Path: {request.url.path}, Details: {str(exc.orig) if exc.orig else str(exc)}")
    return JSONResponse(
        status_code=409,
        content=ErrorResponse(error_code="CONFLICT", message="Database integrity constraint violated").model_dump()
    )