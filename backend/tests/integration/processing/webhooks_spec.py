import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch
from src.main import app
from src.core.config import settings

@pytest.mark.asyncio
async def test_webhook_security():
    payload = {
        "task_id": "00000000-0000-0000-0000-000000000000",
        "file_id": "00000000-0000-0000-0000-000000000000",
        "status": "completed",
        "error_message": None, 
        "stems": []
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response1 = await client.post("/api/processing/webhooks", json=payload)
        assert response1.status_code == 422 
        
        response2 = await client.post(
            "/api/processing/webhooks", 
            json=payload, 
            headers={"X-Internal-Token": "wrong_token"}
        )
        assert response2.status_code == 401

        with patch("src.modules.processing.routers.webhooks.process_webhook", return_value=None):
            response3 = await client.post(
                "/api/processing/webhooks", 
                json=payload, 
                headers={"X-Internal-Token": settings.INTERNAL_WEBHOOK_TOKEN}
            )
            assert response3.status_code == 200