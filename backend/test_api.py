import requests
import json

BASE_URL = "http://localhost:5000"

def test_register():
    print("Testing user registration...")
    data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.json() if response.ok else None

def test_login():
    print("\nTesting user login...")
    data = {
        "username": "testuser",
        "password": "testpass123"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.json() if response.ok else None

def test_tasks(token):
    print("\nTesting tasks endpoints...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test getting tasks
    response = requests.get(f"{BASE_URL}/tasks", headers=headers)
    print(f"GET tasks status: {response.status_code}")
    print(f"Tasks: {response.json()}")
    
    # Test adding a task
    task_data = {
        "task": "Test task from API",
        "priority": "medium",
        "status": "To Do"
    }
    response = requests.post(f"{BASE_URL}/tasks", json=task_data, headers=headers)
    print(f"POST task status: {response.status_code}")
    print(f"New task: {response.json()}")

if __name__ == "__main__":
    print("Testing Backend API...")
    
    # Test registration
    register_result = test_register()
    
    # Test login
    login_result = test_login()
    
    if login_result and "access_token" in login_result:
        # Test tasks with authentication
        test_tasks(login_result["access_token"])
    else:
        print("Login failed, cannot test tasks endpoints") 