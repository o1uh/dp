import logging
import sys
import json
import os

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

def setup_logger() -> logging.Logger:
    logger = logging.getLogger("audio_platform")
    logger.setLevel(logging.INFO)
    
    handler = logging.StreamHandler(sys.stdout)
    
    env = os.getenv("ENVIRONMENT", "development")
    if env == "production":
        handler.setFormatter(JSONFormatter())
    else:
        formatter = logging.Formatter('%(levelname)-5.5s [%(name)s] %(message)s')
        handler.setFormatter(formatter)
    
    if not logger.handlers:
        logger.addHandler(handler)
        
    return logger

logger = setup_logger()