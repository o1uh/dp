import pytest
from httpx import AsyncClient
from unittest.mock import patch
from src.main import app

@pytest.mark.asyncio
async def test_healthcheck_dependencies_failure():
    async with AsyncClient(app=app, base_url="http://test") as client:
        with patch("src.core.health.async_session_maker", side_effect=Exception("DB Connection Refused")):
            response = await client.get("/api/health/readiness")
            assert response.status_code == 503
            assert "DB error" in response.json()["detail"]

        with patch("redis.asyncio.from_url") as mock_redis:
            mock_redis.return_value.ping.side_effect = Exception("Redis Timeout")
            response = await client.get("/api/health/readiness")
            assert response.status_code == 503
            assert "Redis error" in response.json()["detail"]

        with patch("aioboto3.Session") as mock_s3:
            mock_s3.return_value.client.side_effect = Exception("S3 Unreachable")
            response = await client.get("/api/health/readiness")
            assert response.status_code == 503
            assert "S3 error" in response.json()["detail"]

@pytest.mark.asyncio
async def test_healthcheck_liveness():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/health/liveness")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}