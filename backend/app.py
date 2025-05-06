from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

tasks = []

@app.route('/tasks', methods=['GET'])
def get_tasks():
	return jsonify(tasks)

@app.route('/tasks', methods=['POST'])
def add_task():
	data = request.get_json()
	tasks.append({'task': data['task']})
	return jsonify({'message': 'Task Added'}), 201

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
