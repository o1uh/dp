import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch
from src.main import app

@pytest.mark.asyncio
async def test_presigned_url_generation(db_session, setup_auth_user):
    token, _ = setup_auth_user
    payload = {
        "file_hash": "new_unique_hash_456",
        "mime_type": "audio/wav",
        "file_size_bytes": 2048,
        "duration_sec": 120.0
    }

    with patch("src.infrastructure.s3.presigned.get_s3_session") as mock_session:
        mock_client = mock_session.return_value.client.return_value.__aenter__.return_value
        mock_client.generate_presigned_url.return_value = "http://minio/bucket/file?signature=123"

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/files/upload-init",
                json=payload,
                headers={"Authorization": f"Bearer {token}"}
            )

            assert response.status_code == 200
            data = response.json()
            
            assert data["is_duplicate"] is False
            assert data["upload_url"] == "http://minio/bucket/file?signature=123"
            
            mock_client.generate_presigned_url.assert_called_once()
            call_args = mock_client.generate_presigned_url.call_args[1]
            assert call_args["ClientMethod"] == "put_object"
            assert call_args["ExpiresIn"] == 3600