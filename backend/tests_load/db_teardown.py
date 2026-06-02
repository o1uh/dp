import redis
from src.core.config import settings

def teardown():
    print("[DB TEARDOWN] Завершение тестирования. Сброс состояния...")
    try:
        r_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        r_client.set("MOCK_ML_PROCESSING", "False")
        print("[DB TEARDOWN] Тестовый режим отключен. Воркеры переведены в режим реального ML.")
    except Exception as re:
        print(f"[DB TEARDOWN ERROR] Не удалось отключить тестовый режим в Redis: {re}")

if __name__ == "__main__":
    teardown()