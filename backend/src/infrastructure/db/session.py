from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.core.config import settings
from src.core.logger import logger

logger.info(f"Configuring database engine. Target URL: {settings.DATABASE_URL}, Pool Size: 20, Max Overflow: 10")
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    echo=False,
)

logger.info("Initializing async_sessionmaker instance...")
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_session() -> AsyncSession:
    logger.info("Database session request received. Generating new session instance...")
    async with async_session_maker() as session:
        logger.info(f"Database session {id(session)} successfully created and yielded to context")
        yield session
        logger.info(f"Database session {id(session)} context closed. Disposing session resource...")