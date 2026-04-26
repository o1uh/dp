from src.core.logger import logger

async def send_reset_password_email(email: str, token: str) -> None:
    # эмуляция отправки email для локальной разработки и тестирования.
    # потом заменяется на aiosmtplib.
    logger.info(f"EMAIL_MOCK: Отправка ссылки для сброса пароля на {email}. Токен: {token}")

async def send_verification_email(email: str, token: str) -> None:
    logger.info(f"EMAIL_MOCK: Отправка ссылки для верификации на {email}. Токен: {token}")