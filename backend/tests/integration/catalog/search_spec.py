import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from src.main import app
import uuid

@pytest.mark.asyncio
async def test_full_text_search(db_session, setup_auth_user):
    token, user_id = setup_auth_user
    user_uuid = uuid.UUID(user_id)

    stmt = text("""
        INSERT INTO tracks (id, user_id, title, genre, visibility, search_vector, play_count, save_count, downloads_count)
        VALUES 
        (:id1, :u_id, 'Jazz Drums Track', 'Jazz', 'public', to_tsvector('simple', 'Jazz Drums Track'), 0, 0, 0),
        (:id2, :u_id, 'Rock Guitar', 'Rock', 'public', to_tsvector('simple', 'Rock Guitar'), 0, 0, 0),
        (:id3, :u_id, 'Private Jazz', 'Jazz', 'private', to_tsvector('simple', 'Private Jazz'), 0, 0, 0)
    """)
    await db_session.execute(stmt, {
        "id1": uuid.uuid4(), "id2": uuid.uuid4(), "id3": uuid.uuid4(), "u_id": user_uuid
    })
    await db_session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Authorization": f"Bearer {token}"}

        res_q = await client.get("/api/catalog/search?q=Drums", headers=headers)
        assert res_q.status_code == 200
        data_q = res_q.json()
        assert data_q["total"] == 1
        assert data_q["items"][0]["title"] == "Jazz Drums Track"

        res_g = await client.get("/api/catalog/search?genre=Jazz", headers=headers)
        assert res_g.status_code == 200
        data_g = res_g.json()
        assert data_g["total"] == 1
        assert data_g["items"][0]["title"] == "Jazz Drums Track"