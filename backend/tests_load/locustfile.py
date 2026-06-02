import os
import random
import uuid
from locust import HttpUser, task, between, events

class AudioPlatformUser(HttpUser):
    wait_time = between(1.0, 3.0)
    
    def on_start(self):
        """Выполняется при старте каждого виртуального пользователя (авторизация)."""
        self.username = f"load_user_{uuid.uuid4().hex[:8]}"
        self.email = f"{self.username}@example.com"
        self.password = "SecurePassword123!"
        self.token = None
        self.user_id = None
        self.file_ids = []

        # 1. Регистрация
        reg_payload = {
            "username": self.username,
            "email": self.email,
            "password": self.password
        }
        with self.client.post("/api/auth/register", json=reg_payload, catch_response=True) as response:
            if response.status_code != 201:
                response.failure(f"Registration failed: {response.text}")
                return

        # 2. Авторизация
        login_payload = {
            "email": self.email,
            "password": self.password
        }
        with self.client.post("/api/auth/login", json=login_payload, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.client.headers.update({"Authorization": f"Bearer {self.token}"})
            else:
                response.failure(f"Login failed: {response.text}")

    @task(4)
    def view_library(self):
        """Чтение списка треков пользователя с пагинацией."""
        if not self.token:
            return
        with self.client.get("/api/tracks?page=1&limit=20", catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.file_ids = [t["file_id"] for t in data.get("items", []) if t.get("file_id")]
                response.success()
            else:
                response.failure(f"Failed to fetch library: {response.status_code}")

    @task(3)
    def search_catalog(self):
        """Поиск по публичному каталогу."""
        if not self.token:
            return
        genres = ["Rock", "Pop", "Jazz", "Electronic"]
        selected_genre = random.choice(genres)
        self.client.get(f"/api/catalog/search?genre={selected_genre}&page=1&limit=10")

    @task(1)
    def simulate_upload_and_dispatch(self):
        """Инициализация загрузки и постановка задачи в очередь."""
        if not self.token:
            return
        
        file_hash = uuid.uuid4().hex
        payload = {
            "file_hash": file_hash,
            "mime_type": "audio/mpeg",
            "file_size_bytes": random.randint(5000000, 15000000),
            "duration_sec": float(random.randint(120, 240)),
            "original_filename": f"track_{file_hash[:8]}.mp3",
            "separation_mode": "cascade_guitar"
        }

        # Шаг 1: Инициализация загрузки
        with self.client.post("/api/files/upload-init", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                file_id = data.get("file_id")
                is_duplicate = data.get("is_duplicate", False)
                response.success()
                
                # Шаг 2: Если не дубликат, подтверждаем загрузку и ставим задачу
                if not is_duplicate and file_id:
                    self.client.post("/api/files/upload-confirm", json={"file_id": file_id})
                    
                    task_payload = {
                        "file_id": file_id,
                        "config": {"model": "htdemucs"}
                    }
                    self.client.post("/api/tasks", json=task_payload)
            else:
                response.failure(f"Upload init failed: {response.status_code}")