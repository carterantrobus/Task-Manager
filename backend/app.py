import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

tasks = []

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Something went wrong"}), 500

@app.route('/tasks', methods=['GET'])
def get_tasks():
    return jsonify(tasks)

@app.route('/tasks', methods=['POST'])
def add_task():
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    task_text = data.get("task", "").strip()
    priority = data.get("priority", "medium")

    if priority not in ["low", "medium", "high"]:
        return jsonify({"error": "Invalid priority level"}), 400

    if not task_text:
        return jsonify({"error": "Task cannot be empty"}), 400

    new_task = {
        "id": str(uuid.uuid4()),
        "task": task_text,
        "priority": priority,
        "completed": False,
        "createdAt": data.get("createdAt")
    }
    tasks.append(new_task)
    return jsonify(new_task), 201

@app.route('/tasks/<task_id>', methods=['DELETE', 'PUT'])
def manage_task(task_id):
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    if request.method == 'DELETE':
        tasks.remove(task)
        return jsonify({"message": "Task Deleted"}), 200

    elif request.method == 'PUT':
        try:
            data = request.get_json(force=True)
            task["task"] = data.get("task", task["task"]).strip()
            task["priority"] = data.get("priority", task["priority"])
            task["completed"] = data.get("completed", task["completed"])

            if task["priority"] not in ["low", "medium", "high"]:
                return jsonify({"error": "Invalid priority level"}), 400
            
            if not task["task"]:
                return jsonify({"error": "Task cannot be empty"}), 400
            
            return jsonify(task), 200
        except Exception:
            return jsonify({"error": "Invalid JSON"}), 400

# Only runs if this file is executed directly
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
