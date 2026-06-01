# backend/tests_load/ws_latency_test.py
import asyncio
import time
import uuid
import httpx
import websockets
import json
import redis.asyncio as redis
import base64

API_URL = "http://localhost"
WS_URL = "ws://localhost"
REDIS_URL = "redis://localhost:6379/0"

latencies = []
connections_count = 100

def extract_user_id_from_token(token: str) -> str:
    """Декодирование payload JWT без верификации подписи для извлечения 'sub' (user_id)."""
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
        payload_json = base64.b64decode(payload_b64).decode("utf-8")
        payload = json.loads(payload_json)
        return payload.get("sub")
    except Exception as e:
        print(f"Ошибка декодирования JWT-токена: {e}")
        return str(uuid.uuid4())

async def register_and_get_token(client_id: int) -> tuple:
    """Регистрация временного пользователя через Nginx и получение JWT-токена."""
    username = f"ws_load_user_{client_id}_{uuid.uuid4().hex[:6]}"
    email = f"{username}@test.com"
    password = "WSPassword123!"
    
    async with httpx.AsyncClient(base_url=API_URL) as client:
        await client.post("/api/auth/register", json={
            "username": username, "email": email, "password": password
        })
        resp = await client.post("/api/auth/login", json={
            "email": email, "password": password
        })
        data = resp.json()
        token = data["access_token"]
        
        # Извлекаем реальный user_id из JWT
        user_id = extract_user_id_from_token(token)
        return token, user_id
    
async def ws_client_worker(client_id: int, token: str, stop_event: asyncio.Event):
    """Виртуальный WebSocket-клиент, удерживающий соединение через Nginx."""
    uri = f"{WS_URL}/ws/notifications?token={token}"
    try:
        async with websockets.connect(uri) as websocket:
            while not stop_event.is_set():
                try:
                    message_raw = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    message = json.loads(message_raw)
                    
                    # Проверка события готовности трека
                    if message.get("event") == "TrackReady":
                        sent_time = message.get("sent_at", 0.0)
                        if sent_time > 0:
                            # Рассчитываем время доставки от Redis до клиента
                            latency = (time.time() - sent_time) * 1000
                            latencies.append(latency)
                except asyncio.TimeoutError:
                    continue
    except Exception as e:
        pass  # Ошибки закрытия сокетов при остановке теста игнорируются

async def trigger_redis_publish(task_id: str, file_id: str, user_ids: list):
    """Прямая публикация события в Redis Pub/Sub."""
    r_client = redis.from_url(REDIS_URL, decode_responses=True)
    
    # Фиксируем время отправки перед выстрелом в шину
    sent_timestamp = time.time()
    
    # Рассылаем персональное событие каждому подключенному пользователю
    for user_id in user_ids:
        payload = {
            "event": "TrackReady",
            "task_id": task_id,
            "file_id": file_id,
            "status": "completed",
            "task_type": "separation",
            "sent_at": sent_timestamp
        }
        event = {
            "user_id": user_id,
            "payload": payload
        }
        await r_client.publish("system_events", json.dumps(event))
        
    await r_client.close()
    print(f"[REDIS] Событие 'TrackReady' опубликовано для {len(user_ids)} получателей.")

async def main():
    print(f"Инициализация {connections_count} пользователей...")
    user_records = []
    
    # 1. Готовим пользователей и токены
    for i in range(connections_count):
        try:
            token, user_id = await register_and_get_token(i)
            user_records.append((token, user_id))
        except Exception as err:
            print(f"Ошибка создания пользователя {i}: {err}")
            
        if i % 10 == 0:
            print(f"Подготовлено пользователей: {i}/{connections_count}")

    stop_event = asyncio.Event()
    print("Подключение WebSocket клиентов...")
    tasks = []
    
    # 2. Подключаем WebSocket-соединения
    for i, (token, user_id) in enumerate(user_records):
        tasks.append(asyncio.create_task(ws_client_worker(i, token, stop_event)))
    
    # Ожидание сборки сокетов Nginx
    await asyncio.sleep(5.0) 
    print(f"Все соединения ({len(tasks)}) активны. Запуск триггера событий...")

    dummy_task_id = str(uuid.uuid4())
    dummy_file_id = str(uuid.uuid4())
    active_user_ids = [rec[1] for rec in user_records]

    # 3. Публикуем событие напрямую в Redis Pub/Sub
    await trigger_redis_publish(dummy_task_id, dummy_file_id, active_user_ids)
    
    # Ожидание сбора ответов на клиентах
    await asyncio.sleep(4.0) 
    
    stop_event.set()
    await asyncio.gather(*tasks, return_exceptions=True)

    # 4. Вывод аналитики задержки
    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        max_latency = max(latencies)
        min_latency = min(latencies)
        print("\n--- РЕЗУЛЬТАТЫ WebSocket ТЕСТИРОВАНИЯ ---")
        print(f"Успешно получено уведомлений: {len(latencies)}/{len(user_records)}")
        print(f"Минимальная задержка (Min Latency): {min_latency:.2f} ms")
        print(f"Средняя задержка (Avg Latency): {avg_latency:.2f} ms")
        print(f"Максимальная задержка (Max Latency): {max_latency:.2f} ms")
    else:
        print("Ошибка: Уведомления не доставлены.")

if __name__ == "__main__":
    asyncio.run(main())