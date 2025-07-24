import os
import sys
import pytest
import json

# Added the project root to the module search path so app.py is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))) 

from backend.app import app, db
from backend.models import User, Task

@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.app_context():
        db.create_all()
        with app.test_client() as client:
            yield client
        db.session.remove()
        db.drop_all()

@pytest.fixture
def auth_headers(client):
    """Create a test user and return authentication headers"""
    # Register a test user
    response = client.post("/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    })
    assert response.status_code == 201
    data = response.get_json()
    token = data["access_token"]
    
    return {"Authorization": f"Bearer {token}"}

# Authentication tests
def test_register_user(client):
    response = client.post("/auth/register", json={
        "username": "newuser",
        "email": "new@example.com",
        "password": "password123"
    })
    assert response.status_code == 201
    data = response.get_json()
    assert "access_token" in data
    assert data["user"]["username"] == "newuser"
    assert data["user"]["email"] == "new@example.com"

def test_register_duplicate_username(client):
    # Register first user
    response = client.post("/auth/register", json={
        "username": "testuser",
        "email": "test1@example.com",
        "password": "password123"
    })
    assert response.status_code == 201
    
    # Try to register with same username
    response = client.post("/auth/register", json={
        "username": "testuser",
        "email": "test2@example.com",
        "password": "password123"
    })
    assert response.status_code == 400
    assert "Username already exists" in response.get_json()["error"]

def test_login_user(client):
    # Register a user first
    response = client.post("/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com",
        "password": "password123"
    })
    assert response.status_code == 201
    
    # Login with the user
    response = client.post("/auth/login", json={
        "username": "loginuser",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data
    assert data["user"]["username"] == "loginuser"

def test_login_invalid_credentials(client):
    response = client.post("/auth/login", json={
        "username": "nonexistent",
        "password": "wrongpass"
    })
    assert response.status_code == 401
    assert "Invalid username/email or password" in response.get_json()["error"]

# Task tests (now require authentication)
def test_add_tasks(client, auth_headers):
    response = client.post("/tasks", json={"task": "Test Task"}, headers=auth_headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data["task"] == "Test Task"
    assert data["priority"] == "medium"  # default priority
    assert "id" in data
    assert data["completed"] == False

def test_get_tasks(client, auth_headers):
    response = client.get("/tasks", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)

def test_add_empty_task(client, auth_headers):
    response = client.post("/tasks", json={"task": ""}, headers=auth_headers)
    assert response.status_code == 400
    assert response.get_json()["error"] == "Task cannot be empty"

def test_add_missing_task_key(client, auth_headers):
    response = client.post("/tasks", json={"not_task": "oops"}, headers=auth_headers)
    assert response.status_code == 400
    assert "error" in response.get_json()

def test_add_invalid_json(client, auth_headers):
    response = client.post("/tasks", data="notjson", content_type="application/json", headers=auth_headers)
    assert response.status_code in [400, 415]

def test_delete_task(client, auth_headers):
    # First add a task
    response = client.post("/tasks", json={"task": "Task to delete"}, headers=auth_headers)
    assert response.status_code == 201
    task_id = response.get_json()["id"]
    
    # Then delete it
    response = client.delete(f"/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.get_json()["message"] == "Task Deleted"
    
    # Verify it's gone
    response = client.get("/tasks", headers=auth_headers)
    tasks = response.get_json()
    assert not any(task["id"] == task_id for task in tasks)

def test_delete_nonexistent_task(client, auth_headers):
    response = client.delete("/tasks/nonexistent-id", headers=auth_headers)
    assert response.status_code == 404
    assert response.get_json()["error"] == "Task not found"

def test_update_task(client, auth_headers):
    # First add a task
    response = client.post("/tasks", json={"task": "Original task", "priority": "low"}, headers=auth_headers)
    assert response.status_code == 201
    task_id = response.get_json()["id"]
    
    # Update the task
    update_data = {
        "task": "Updated task",
        "priority": "high",
        "completed": True
    }
    response = client.put(f"/tasks/{task_id}", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    
    updated_task = response.get_json()
    assert updated_task["task"] == "Updated task"
    assert updated_task["priority"] == "high"
    assert updated_task["completed"] == True
    assert updated_task["id"] == task_id

def test_update_nonexistent_task(client, auth_headers):
    response = client.put("/tasks/nonexistent-id", json={"task": "Updated"}, headers=auth_headers)
    assert response.status_code == 404
    assert response.get_json()["error"] == "Task not found"

def test_update_task_empty_text(client, auth_headers):
    # First add a task
    response = client.post("/tasks", json={"task": "Original task"}, headers=auth_headers)
    assert response.status_code == 201
    task_id = response.get_json()["id"]
    
    # Try to update with empty task
    response = client.put(f"/tasks/{task_id}", json={"task": ""}, headers=auth_headers)
    assert response.status_code == 400
    assert response.get_json()["error"] == "Task cannot be empty"

def test_update_task_invalid_priority(client, auth_headers):
    # First add a task
    response = client.post("/tasks", json={"task": "Original task"}, headers=auth_headers)
    assert response.status_code == 201
    task_id = response.get_json()["id"]
    
    # Try to update with invalid priority
    response = client.put(f"/tasks/{task_id}", json={"priority": "invalid"}, headers=auth_headers)
    assert response.status_code == 400
    assert response.get_json()["error"] == "Invalid priority level"

def test_update_task_invalid_json(client, auth_headers):
    # First add a task
    response = client.post("/tasks", json={"task": "Original task"}, headers=auth_headers)
    assert response.status_code == 201
    task_id = response.get_json()["id"]
    
    # Try to update with invalid JSON
    response = client.put(f"/tasks/{task_id}", data="notjson", content_type="application/json", headers=auth_headers)
    assert response.status_code == 400
    assert response.get_json()["error"] == "Invalid JSON"

def test_add_task_with_priority(client, auth_headers):
    response = client.post("/tasks", json={"task": "High priority task", "priority": "high"}, headers=auth_headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data["task"] == "High priority task"
    assert data["priority"] == "high"

def test_add_task_invalid_priority(client, auth_headers):
    response = client.post("/tasks", json={"task": "Task", "priority": "invalid"}, headers=auth_headers)
    assert response.status_code == 400
    assert response.get_json()["error"] == "Invalid priority level"

def test_add_task_with_status_and_due_date(client, auth_headers):
    response = client.post("/tasks", json={"task": "Task with status and due date", "status": "In Progress", "dueDate": "2024-06-01T12:00:00Z"}, headers=auth_headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data["task"] == "Task with status and due date"
    assert data["status"] == "In Progress"
    # Accept both with and without 'Z'
    assert data["dueDate"].startswith("2024-06-01T12:00:00")

def test_update_task_status_and_due_date(client, auth_headers):
    response = client.post("/tasks", json={"task": "Task to update status and due date"}, headers=auth_headers)
    assert response.status_code == 201
    task_id = response.get_json()["id"]

    update_data = {
        "status": "Done",
        "dueDate": "2024-07-01T09:00:00Z"
    }
    response = client.put(f"/tasks/{task_id}", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    updated_task = response.get_json()
    assert updated_task["status"] == "Done"
    # Accept both with and without 'Z'
    assert updated_task["dueDate"].startswith("2024-07-01T09:00:00")

# Test unauthorized access
def test_unauthorized_access(client):
    response = client.get("/tasks")
    assert response.status_code == 401

def test_unauthorized_add_task(client):
    response = client.post("/tasks", json={"task": "Test Task"})
    assert response.status_code == 401

