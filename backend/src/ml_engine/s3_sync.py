import boto3
from pathlib import Path
from src.core.config import settings
from src.core.logger import logger

def get_boto3_client():
    logger.info(f"Instantiating low-level S3 boto3 client. Endpoint: {settings.S3_ENDPOINT}, Key ID: {settings.S3_ACCESS_KEY}")
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY
    )

def download_file(bucket: str, s3_key: str, download_path: Path):
    logger.info(f"[S3 I/O DOWNLOAD] Initiating download request. Source Bucket: '{bucket}', Key: '{s3_key}', Destination Path: '{download_path}'")
    try:
        s3 = get_boto3_client()
        s3.download_file(bucket, s3_key, str(download_path))
        
        file_size = download_path.stat().st_size
        logger.info(f"[S3 I/O DOWNLOAD SUCCESS] Download finalized. Total bytes written: {file_size} bytes")
    except Exception as e:
        logger.error(f"[S3 I/O DOWNLOAD ERROR] Low-level S3 download failed. Bucket: '{bucket}', Key: '{s3_key}': {e}", exc_info=True)
        raise

def upload_file(bucket: str, file_path: Path, s3_key: str, content_type: str):
    file_size = file_path.stat().st_size
    logger.info(f"[S3 I/O UPLOAD] Initiating upload request. Source Path: '{file_path}' ({file_size} bytes), Target Bucket: '{bucket}', Key: '{s3_key}', Content-Type: '{content_type}'")
    try:
        s3 = get_boto3_client()
        s3.upload_file(
            str(file_path), 
            bucket, 
            s3_key,
            ExtraArgs={'ContentType': content_type}
        )
        logger.info(f"[S3 I/O UPLOAD SUCCESS] Upload finalized. Target Key S3 Key reference: {s3_key}")
    except Exception as e:
        logger.error(f"[S3 I/O UPLOAD ERROR] Low-level S3 upload failed. Bucket: '{bucket}', Key: '{s3_key}': {e}", exc_info=True)
        raise