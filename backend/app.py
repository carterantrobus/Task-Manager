import os
from datetime import datetime, timedelta
import secrets
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from .models import db, User, Task
from .auth import create_user, authenticate_user, get_current_user
from .email_utils import send_email
from .models import PasswordResetToken
from dotenv import load_dotenv

app = Flask(__name__)

# Configuration
APP_ENV = os.environ.get('APP_ENV', 'development').lower()

# Load .env only for non-production to aid local development
if APP_ENV != 'production':
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path)

# Database configuration: require POSTGRES_URI in production, allow sqlite fallback in dev/test
if APP_ENV == 'production':
    postgres_uri = os.environ.get('POSTGRES_URI')
    if not postgres_uri:
        raise RuntimeError('POSTGRES_URI must be set in production')
    app.config['SQLALCHEMY_DATABASE_URI'] = postgres_uri
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('POSTGRES_URI', 'sqlite:///tasks.db')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Require JWT secret key. Fail fast if missing.
jwt_secret = os.environ.get('JWT_SECRET_KEY')
if not jwt_secret:
    raise RuntimeError('JWT_SECRET_KEY must be set')
app.config['JWT_SECRET_KEY'] = jwt_secret

# Shorter access token lifetime and enable refresh tokens
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=2)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=7)

# Initialize extensions
# Tighten CORS for production by restricting to configured frontend origin
frontend_origin = os.environ.get('FRONTEND_ORIGIN')
if APP_ENV == 'production' and frontend_origin:
    CORS(app, resources={r"/*": {"origins": [frontend_origin]}})
else:
    CORS(app)

db.init_app(app)
jwt = JWTManager(app)

# Rate limiting
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day", "50 per hour"])

# Create database tables
with app.app_context():
    db.create_all()

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Something went wrong"}), 500

# Liveness/health check endpoint for load balancers
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

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
        refresh_token = create_refresh_token(identity=user.id)
        return jsonify({
            "message": "User created successfully",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            }
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@app.route('/auth/login', methods=['POST'])
@limiter.limit("5 per minute")
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
        refresh_token = create_refresh_token(identity=user.id)
        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "refresh_token": refresh_token,
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
@limiter.limit("3 per minute")
def request_password_reset():
    try:
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
            # Build reset link using environment variable or default to production URL
            frontend_url = os.environ.get('FRONTEND_URL', 'https://monstager.xyz')
            reset_link = f"{frontend_url}/reset-password?token={token}"
            subject = "Password Reset Request"
            body = f"Hello {user.username},\n\nTo reset your password, click the link below (valid for 1 hour):\n{reset_link}\n\nIf you did not request this, you can ignore this email."
            try:
                send_email(user.email, subject, body)
            except Exception as e:
                # Log the error but don't fail the request (security: don't reveal if email failed)
                print(f"Failed to send password reset email: {e}")
                import traceback
                traceback.print_exc()
                # Continue anyway to avoid leaking information about email delivery status
        # Always return success to avoid leaking user existence
        return jsonify({"message": "If an account with that email exists, a password reset link has been sent."}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

@app.route('/auth/reset-password', methods=['POST'])
@limiter.limit("3 per minute")
def reset_password():
    try:
        try:
            data = request.get_json(force=True)
        except Exception:
            return jsonify({"error": "Invalid JSON"}), 400

        token = data.get('token', '').strip()
        new_password = data.get('password', '')

        if not token or not new_password:
            return jsonify({"error": "Token and new password are required"}), 400

        # Validate password strength
        from .auth import validate_password
        if not validate_password(new_password):
            return jsonify({"error": "Password must be at least 12 characters long and include lowercase, uppercase, digit, and special character"}), 400

        reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()
        if not reset_token:
            return jsonify({"error": "Invalid or expired token"}), 400
        if reset_token.expires_at < datetime.utcnow():
            return jsonify({"error": "Token has expired"}), 400

        user = User.query.get(reset_token.user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Update password
        from .auth import hash_password
        user.password_hash = hash_password(new_password)
        reset_token.used = True
        db.session.commit()
        return jsonify({"message": "Password has been reset successfully."}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

# Refresh token endpoint
@app.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_access_token():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({"access_token": access_token}), 200

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
    print(f"Starting Flask app on host=0.0.0.0, port=5000")
    app.run(host='0.0.0.0', port=5000)
