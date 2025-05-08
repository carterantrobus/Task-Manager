import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))) 

from backend.app import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_add_tasks(client):
    response = client.post("/tasks", json={"task": "Test Task"})
    assert response.status_code == 201
    assert response.get_json()["message"] == "Task Added"

def test_get_tasks(client):
    response = client.get("/tasks")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)

