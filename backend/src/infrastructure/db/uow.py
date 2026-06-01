from sqlalchemy.ext.asyncio import AsyncSession
from src.infrastructure.db.session import async_session_maker
from src.core.logger import logger

class UnitOfWork:
    def __init__(self):
        self.session_factory = async_session_maker
        logger.info("UnitOfWork structure instantiated.")

    async def __aenter__(self):
        self.session: AsyncSession = self.session_factory()
        logger.info(f"[UOW START] Session {id(self.session)} allocated. Entering transaction boundary...")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        logger.info(f"[UOW EXIT] Exiting transaction boundary for Session {id(self.session)}.")
        if exc_type is not None:
            logger.error(f"[UOW EXIT ERROR] Exception detected inside context. Type: {exc_type}, Value: {exc_val}. Triggering transaction rollback...", exc_info=True)
            await self.rollback()
        else:
            logger.info("[UOW EXIT] Context finished cleanly. No active exceptions detected.")
        
        await self.session.close()
        logger.info(f"[UOW CLOSE] Session {id(self.session)} successfully closed and released to pool.")

    async def commit(self):
        logger.info(f"[UOW COMMIT] Executing DB commit on Session {id(self.session)}...")
        try:
            await self.session.commit()
            logger.info(f"[UOW COMMIT SUCCESS] Session {id(self.session)} successfully committed to PostgreSQL.")
        except Exception as e:
            logger.error(f"[UOW COMMIT ERROR] Failed to commit Session {id(self.session)}: {e}", exc_info=True)
            raise

    async def rollback(self):
        logger.info(f"[UOW ROLLBACK] Executing DB rollback on Session {id(self.session)}...")
        try:
            await self.session.rollback()
            logger.info(f"[UOW ROLLBACK SUCCESS] Session {id(self.session)} successfully rolled back.")
        except Exception as e:
            logger.error(f"[UOW ROLLBACK ERROR] Failed to rollback Session {id(self.session)}: {e}", exc_info=True)
            raise