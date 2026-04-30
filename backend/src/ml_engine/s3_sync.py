import boto3
from pathlib import Path
from src.core.config import settings

def get_boto3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY
    )

def download_file(bucket: str, s3_key: str, download_path: Path):
    s3 = get_boto3_client()
    s3.download_file(bucket, s3_key, str(download_path))

def upload_file(bucket: str, file_path: Path, s3_key: str, content_type: str):
    s3 = get_boto3_client()
    s3.upload_file(
        str(file_path), 
        bucket, 
        s3_key,
        ExtraArgs={'ContentType': content_type}
    )