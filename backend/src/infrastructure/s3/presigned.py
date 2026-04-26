from botocore.client import Config
from src.infrastructure.s3.client import get_s3_session, get_s3_client_params
from src.core.config import settings

def _get_presign_params():
    params = get_s3_client_params()
    params["endpoint_url"] = settings.S3_PUBLIC_ENDPOINT
    params["region_name"] = "us-east-1"
    params["config"] = Config(signature_version="s3v4")
    return params

async def generate_put_url(bucket_name: str, object_name: str, content_type: str, expiration: int = 3600) -> str:
    session = get_s3_session()
    async with session.client(**_get_presign_params()) as client:
        return await client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': bucket_name, 
                'Key': object_name,
                'ContentType': content_type  
            },
            ExpiresIn=expiration
        )

async def generate_get_url(bucket_name: str, object_name: str, expiration: int = 3600) -> str:
    session = get_s3_session()
    async with session.client(**_get_presign_params()) as client:
        return await client.generate_presigned_url(
            ClientMethod='get_object',
            Params={
                'Bucket': bucket_name, 
                'Key': object_name,
                'ResponseContentDisposition': f'attachment; filename="{object_name.split("/")[-1]}"'
            },
            ExpiresIn=expiration
        )