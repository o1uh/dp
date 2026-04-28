import aioboto3
from src.core.config import settings

def get_s3_session() -> aioboto3.Session:
    return aioboto3.Session()

def get_s3_client_params() -> dict:
    return {
        "service_name": "s3",
        "endpoint_url": settings.S3_ENDPOINT,
        "aws_access_key_id": settings.S3_ACCESS_KEY,
        "aws_secret_access_key": settings.S3_SECRET_KEY
    }