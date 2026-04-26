from src.infrastructure.s3.client import get_s3_session, get_s3_client_params

async def generate_put_url(bucket_name: str, object_name: str, expiration: int = 3600) -> str:
    session = get_s3_session()
    async with session.client(**get_s3_client_params()) as client:
        url = await client.generate_presigned_url(
            ClientMethod='put_object',
            Params={'Bucket': bucket_name, 'Key': object_name},
            ExpiresIn=expiration
        )
    return url

async def generate_get_url(bucket_name: str, object_name: str, expiration: int = 3600) -> str:
    session = get_s3_session()
    async with session.client(**get_s3_client_params()) as client:
        url = await client.generate_presigned_url(
            ClientMethod='get_object',
            Params={
                'Bucket': bucket_name, 
                'Key': object_name,
                'ResponseContentDisposition': f'attachment; filename="{object_name.split("/")[-1]}"'
            },
            ExpiresIn=expiration
        )
    return url