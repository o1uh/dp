import asyncio
import uuid
import redis
from src.core.config import settings
from sqlalchemy import select, delete
from src.infrastructure.db.session import async_session_maker
from src.modules.rbac.models import Role
from src.modules.users.models import User

async def setup():
    print("[DB SETUP] Начало автоматической подготовки базы данных...")
    async with async_session_maker() as session:
        # 1. Гарантируем наличие роли b2c_user
        stmt = select(Role).where(Role.name == "b2c_user")
        res = await session.execute(stmt)
        role = res.scalar_one_or_none()
        
        if not role:
            role = Role(id=uuid.uuid4(), name="b2c_user", description="Default load test role")
            session.add(role)
            print("[DB SETUP] Роль 'b2c_user' успешно создана.")
        else:
            print("[DB SETUP] Роль 'b2c_user' уже существует.")
        
        # 2. Очищаем базу данных от профилей предыдущих тестов
        # Каскадное удаление (ON DELETE CASCADE) в схеме автоматически 
        # удалит связанные токены, задачи, квоты, треки и стемы.
        stmt_del = delete(User).where(
            User.username.like("load_user_%") | User.username.like("ws_load_user_%")
        )
        del_res = await session.execute(stmt_del)
        print(f"[DB SETUP] Удалено старых тестовых пользователей: {del_res.rowcount}")
        
        await session.commit()
    print("[DB SETUP] База данных готова к тестированию.")
    try:
        r_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        r_client.set("MOCK_ML_PROCESSING", "True")
        print("[DB SETUP] Тестовый режим (Mock Mode) успешно включен в Redis.")
    except Exception as re:
        print(f"[DB SETUP ERROR] Не удалось включить тестовый режим в Redis: {re}")

if __name__ == "__main__":
    asyncio.run(setup())