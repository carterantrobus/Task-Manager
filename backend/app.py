import os
print(open('.env').read())
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
print(os.environ.get('SMTP_HOST'))
print(os.environ.get('SMTP_USER'))
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models import db, User, Task
from auth import create_user, authenticate_user, get_current_user
from email_utils import send_email
import secrets
from models import PasswordResetToken

app = Flask(__name__)

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tasks.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Initialize extensions
CORS(app)
db.init_app(app)
jwt = JWTManager(app)

# Create database tables
with app.app_context():
    db.create_all()

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Something went wrong"}), 500

# Authentication endpoints
@app.route('/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required"}), 400

    try:
        user = create_user(username, email, password)
        access_token = create_access_token(identity=user.id)
        return jsonify({
            "message": "User created successfully",
            "access_token": access_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            }
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@app.route('/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    identifier = data.get('username', '').strip() or data.get('email', '').strip()
    password = data.get('password', '')

    if not identifier or not password:
        return jsonify({"error": "Username or email and password are required"}), 400

    user = authenticate_user(identifier, password)
    if user:
        access_token = create_access_token(identity=user.id)
        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            }
        }), 200
    else:
        return jsonify({"error": "Invalid username/email or password"}), 401

@app.route('/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at.isoformat()
    }), 200

@app.route('/auth/request-password-reset', methods=['POST'])
def request_password_reset():
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if user:
        # Generate a secure token
        token = secrets.token_urlsafe(48)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        reset_token = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
        db.session.add(reset_token)
        db.session.commit()
        # Build reset link (assume frontend at http://localhost:3000/reset-password)
        reset_link = f"http://localhost:3000/reset-password?token={token}"
        subject = "Password Reset Request"
        body = f"Hello {user.username},\n\nTo reset your password, click the link below (valid for 1 hour):\n{reset_link}\n\nIf you did not request this, you can ignore this email."
        try:
            send_email(user.email, subject, body)
        except Exception as e:
            print(f"Failed to send password reset email: {e}")
    # Always return success to avoid leaking user existence
    return jsonify({"message": "If an account with that email exists, a password reset link has been sent."}), 200

@app.route('/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    token = data.get('token', '').strip()
    new_password = data.get('password', '')

    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400

    reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
    if not reset_token:
        return jsonify({"error": "Invalid or expired token"}), 400
    if reset_token.expires_at < datetime.utcnow():
        return jsonify({"error": "Token has expired"}), 400

    user = User.query.get(reset_token.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Update password
    from auth import hash_password
    user.password_hash = hash_password(new_password)
    reset_token.used = True
    db.session.commit()
    return jsonify({"message": "Password has been reset successfully."}), 200

# Task endpoints (now require authentication)
@app.route('/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    tasks = Task.query.filter_by(user_id=user.id).all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/tasks', methods=['POST'])
@jwt_required()
def add_task():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    task_text = data.get("task", "").strip()
    priority = data.get("priority", "medium")
    status = data.get("status", "To Do")
    due_date_str = data.get("dueDate")

    if priority not in ["low", "medium", "high"]:
        return jsonify({"error": "Invalid priority level"}), 400

    if not task_text:
        return jsonify({"error": "Task cannot be empty"}), 400

    # Parse due date if provided
    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"error": "Invalid date format"}), 400

    new_task = Task(task_text, priority, status, due_date, user.id)
    
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify(new_task.to_dict()), 201

@app.route('/tasks/<task_id>', methods=['DELETE', 'PUT'])
@jwt_required()
def manage_task(task_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    task = Task.query.filter_by(id=task_id, user_id=user.id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    if request.method == 'DELETE':
        db.session.delete(task)
        db.session.commit()
        return jsonify({"message": "Task Deleted"}), 200

    elif request.method == 'PUT':
        try:
            data = request.get_json(force=True)
            
            if "task" in data:
                task.task = data["task"].strip()
            if "priority" in data:
                task.priority = data["priority"]
            if "completed" in data:
                task.completed = data["completed"]
            if "status" in data:
                task.status = data["status"]
            if "dueDate" in data:
                due_date_str = data["dueDate"]
                if due_date_str:
                    try:
                        task.due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
                    except ValueError:
                        return jsonify({"error": "Invalid date format"}), 400
                else:
                    task.due_date = None

            if task.priority not in ["low", "medium", "high"]:
                return jsonify({"error": "Invalid priority level"}), 400
            
            if not task.task:
                return jsonify({"error": "Task cannot be empty"}), 400
            
            db.session.commit()
            return jsonify(task.to_dict()), 200
        except Exception:
            return jsonify({"error": "Invalid JSON"}), 400

# Only runs if this file is executed directly
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
