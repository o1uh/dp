import os
import random
from locust import HttpUser, task, between

TEST_TOKEN = os.getenv("LOCUST_TEST_TOKEN", "")

class ProcessingUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        self.client.headers.update({"Authorization": f"Bearer {TEST_TOKEN}"})
        self.file_ids = [
            "00000000-0000-0000-0000-000000000001",
            "00000000-0000-0000-0000-000000000002"
        ]

    @task
    def create_processing_task(self):
        if not TEST_TOKEN:
            return

        payload = {
            "file_id": random.choice(self.file_ids),
            "model_config": {"model": "HT_Demucs_v4"}
        }
        
        with self.client.post("/api/tasks", json=payload, catch_response=True) as response:
            if response.status_code == 202:
                response.success()
            else:
                response.failure(f"Failed to create task: {response.status_code}")