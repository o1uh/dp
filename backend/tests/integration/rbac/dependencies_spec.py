import pytest
from fastapi import FastAPI, Depends
from httpx import AsyncClient, ASGITransport
from src.common.dependencies import RoleChecker
from src.core.security import create_access_token
from src.core.exceptions import AppException
from src.core.handlers import app_exception_handler

app = FastAPI()
app.add_exception_handler(AppException, app_exception_handler)

@app.get("/admin-only", dependencies=[Depends(RoleChecker(["admin"]))])
async def admin_route():
    return {"status": "ok"}

@pytest.mark.asyncio
async def test_require_permissions_forbidden(db_session, setup_roles_and_users):
    user_id, role_id = setup_roles_and_users["b2c_user"]
    token = create_access_token(str(user_id), str(role_id))
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/admin-only", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        assert response.json()["error_code"] == "ACCESS_DENIED"

@pytest.mark.asyncio
async def test_require_permissions_allowed(db_session, setup_roles_and_users):
    user_id, role_id = setup_roles_and_users["admin"]
    token = create_access_token(str(user_id), str(role_id))
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/admin-only", 
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200