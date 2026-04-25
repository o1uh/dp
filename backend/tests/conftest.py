import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from src.infrastructure.db.base import Base
from src.core.config import settings
from src.modules.users.models import User
from src.modules.rbac.models import Role
from src.core.security import create_access_token

test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
TestingSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

import src.infrastructure.db.session as db_session_module
db_session_module.engine = test_engine
db_session_module.async_session_maker = TestingSessionLocal

@pytest_asyncio.fixture(autouse=True)
async def init_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    async with TestingSessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def setup_roles_and_users(db_session: AsyncSession):
    role_user = Role(name="b2c_user", description="Default user")
    role_admin = Role(name="admin", description="Administrator")
    db_session.add_all([role_user, role_admin])
    await db_session.flush()

    user_b2c = User(
        username="test_b2c",
        email="authuser@example.com",
        password_hash="hashed_password",
        role_id=role_user.id,
        is_active=True,
        is_email_verified=True
    )
    user_admin = User(
        username="test_admin",
        email="admin@example.com",
        password_hash="hashed_password",
        role_id=role_admin.id,
        is_active=True,
        is_email_verified=True
    )
    db_session.add_all([user_b2c, user_admin])
    await db_session.commit()

    return {
        "b2c_user": (user_b2c.id, role_user.id),
        "admin": (user_admin.id, role_admin.id)
    }

@pytest_asyncio.fixture
async def setup_auth_user(setup_roles_and_users):
    user_id, role_id = setup_roles_and_users["b2c_user"]
    token = create_access_token(str(user_id), str(role_id))
    return token, str(user_id)