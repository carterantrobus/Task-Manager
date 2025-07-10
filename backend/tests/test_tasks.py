import os
import sys
import pytest

# Added the project root to the module search path so app.py is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))) 

from backend.app import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

# Test: successful task addition
def test_add_tasks(client):
    response = client.post("/tasks", json={"task": "Test Task"})
    assert response.status_code == 201
    data = response.get_json()
    assert data["task"] == "Test Task"
    assert data["priority"] == "medium"  # default priority
    assert "id" in data
    assert data["completed"] == False

# Task: get tasks (list format)
def test_get_tasks(client):
    response = client.get("/tasks")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)

# Test: empty string input
def test_add_empty_task(client):
    response = client.post("/tasks", json={"task": ""})
    assert response.status_code == 400
    assert response.get_json()["error"] == "Task cannot be empty"

# Test: missing 'task' key
def test_add_missing_task_key(client):
    response = client.post("/tasks", json={"not_task": "oops"})
    assert response.status_code == 400
    assert "error" in response.get_json()

# Test: invalid JSON payload
def test_add_invalid_json(client):
    response = client.post("/tasks", data="notjson", content_type="application/json")
    assert response.status_code in [400, 415]

# Test: successful task deletion
def test_delete_task(client):
    # First add a task
    response = client.post("/tasks", json={"task": "Task to delete"})
    assert response.status_code == 201
    task_id = response.get_json()["id"]
    
    # Then delete it
    response = client.delete(f"/tasks/{task_id}")
    assert response.status_code == 200
    assert response.get_json()["message"] == "Task Deleted"
    
    # Verify it's gone
    response = client.get("/tasks")
    tasks = response.get_json()
    assert not any(task["id"] == task_id for task in tasks)

# Test: delete non-existent task
def test_delete_nonexistent_task(client):
    response = client.delete("/tasks/nonexistent-id")
    assert response.status_code == 404
    assert response.get_json()["error"] == "Task not found"

# Test: successful task update
def test_update_task(client):
    # First add a task
    response = client.post("/tasks", json={"task": "Original task", "priority": "low"})
    assert response.status_code == 201
    task_id = response.get_json()["id"]
    
    # Update the task
    update_data = {
        "task": "Updated task",
        "priority": "high",
        "completed": True
    }
    response = client.put(f"/tasks/{task_id}", json=update_data)
    assert response.status_code == 200
    
    updated_task = response.get_json()
    assert updated_task["task"] == "Updated task"
    assert updated_task["priority"] == "high"
    assert updated_task["completed"] == True
    assert updated_task["id"] == task_id

# Test: update non-existent task
def test_update_nonexistent_task(client):
    response = client.put("/tasks/nonexistent-id", json={"task": "Updated"})
    assert response.status_code == 404
    assert response.get_json()["error"] == "Task not found"

# Test: update task with empty text
def test_update_task_empty_text(client):
    # First add a task
    response = client.post("/tasks", json={"task": "Original task"})
    assert response.status_code == 201
    task_id = response.get_json()["id"]
    
    # Try to update with empty task
    response = client.put(f"/tasks/{task_id}", json={"task": ""})
    assert response.status_code == 400
    assert response.get_json()["error"] == "Task cannot be empty"

# Test: update task with invalid priority
def test_update_task_invalid_priority(client):
    # First add a task
    response = client.post("/tasks", json={"task": "Original task"})
    assert response.status_code == 201
    task_id = response.get_json()["id"]
    
    # Try to update with invalid priority
    response = client.put(f"/tasks/{task_id}", json={"priority": "invalid"})
    assert response.status_code == 400
    assert response.get_json()["error"] == "Invalid priority level"

# Test: update task with invalid JSON
def test_update_task_invalid_json(client):
    # First add a task
    response = client.post("/tasks", json={"task": "Original task"})
    assert response.status_code == 201
    task_id = response.get_json()["id"]
    
    # Try to update with invalid JSON
    response = client.put(f"/tasks/{task_id}", data="notjson", content_type="application/json")
    assert response.status_code == 400
    assert response.get_json()["error"] == "Invalid JSON"

# Test: add task with custom priority
def test_add_task_with_priority(client):
    response = client.post("/tasks", json={"task": "High priority task", "priority": "high"})
    assert response.status_code == 201
    data = response.get_json()
    assert data["task"] == "High priority task"
    assert data["priority"] == "high"

# Test: add task with invalid priority
def test_add_task_invalid_priority(client):
    response = client.post("/tasks", json={"task": "Task", "priority": "invalid"})
    assert response.status_code == 400
    assert response.get_json()["error"] == "Invalid priority level"