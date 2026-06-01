from botocore.client import Config
from src.infrastructure.s3.client import get_s3_session, get_s3_client_params
from src.core.config import settings
from src.core.logger import logger

def _get_presign_params():
    params = get_s3_client_params()
    params["endpoint_url"] = settings.S3_PUBLIC_ENDPOINT
    params["region_name"] = "us-east-1"
    params["config"] = Config(signature_version="s3v4")
    logger.info(f"Building presign parameters dictionary. Target Endpoint: {params['endpoint_url']}")
    return params

async def generate_put_url(bucket_name: str, object_name: str, content_type: str, expiration: int = 3600) -> str:
    logger.info(f"Requesting S3 presigned PUT URL. Bucket: {bucket_name}, Key: {object_name}, Type: {content_type}, TTL: {expiration}s")
    session = get_s3_session()
    params = _get_presign_params()
    async with session.client(**params) as client:
        url = await client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': bucket_name, 
                'Key': object_name,
                'ContentType': content_type  
            },
            ExpiresIn=expiration
        )
        logger.info(f"PUT URL successfully generated: {url}")
        return url

async def generate_get_url(bucket_name: str, object_name: str, expiration: int = 3600) -> str:
    logger.info(f"Requesting S3 presigned GET URL. Bucket: {bucket_name}, Key: {object_name}, TTL: {expiration}s")
    session = get_s3_session()
    params = _get_presign_params()
    async with session.client(**params) as client:
        filename = object_name.split("/")[-1]
        url = await client.generate_presigned_url(
            ClientMethod='get_object',
            Params={
                'Bucket': bucket_name, 
                'Key': object_name,
                'ResponseContentDisposition': f'attachment; filename="{filename}"'
            },
            ExpiresIn=expiration
        )
        logger.info(f"GET URL successfully generated: {url}")
        return url