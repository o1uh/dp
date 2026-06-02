import logging
import sys
import json
import os
from typing import List

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "pathname": record.pathname,
            "lineno": record.lineno,
            "funcName": record.funcName
        }
        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

def setup_logger() -> logging.Logger:
    env = os.getenv("ENVIRONMENT", "development")
    
    if env == "production":
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter('%(asctime)s [%(levelname)s] [%(name)s] (%(pathname)s:%(lineno)d) - %(message)s')
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
        
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    external_loggers: List[str] = [
        "uvicorn",
        "uvicorn.access",
        "uvicorn.error",
        "fastapi",
        "gunicorn",
        "sqlalchemy.engine",
        "celery"
    ]

    for logger_name in external_loggers:
        ext_logger = logging.getLogger(logger_name)
        ext_logger.handlers = []
        ext_logger.propagate = True

    project_logger = logging.getLogger("audio_platform")
    project_logger.setLevel(logging.DEBUG)
    project_logger.propagate = True
        
    return project_logger

logger = setup_logger()