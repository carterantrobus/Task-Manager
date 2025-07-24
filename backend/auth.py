import bcrypt
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from .models import User, db
import re

def hash_password(password):
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed_password):
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_username(username):
    """Validate username format (alphanumeric, 3-20 characters)"""
    pattern = r'^[a-zA-Z0-9_]{3,20}$'
    return re.match(pattern, username) is not None

def validate_password(password):
    """Validate password strength (at least 6 characters)"""
    return len(password) >= 6

def create_user(username, email, password):
    """Create a new user"""
    email = email.strip().lower()
    if not validate_username(username):
        raise ValueError("Username must be 3-20 characters long and contain only letters, numbers, and underscores")
    
    if not validate_email(email):
        raise ValueError("Invalid email format")
    
    if not validate_password(password):
        raise ValueError("Password must be at least 6 characters long")
    
    # Check if username or email already exists
    if User.query.filter_by(username=username).first():
        raise ValueError("Username already exists")
    
    if User.query.filter_by(email=email).first():
        raise ValueError("Email already exists")
    
    # Create new user
    hashed_password = hash_password(password)
    user = User(username=username, email=email, password_hash=hashed_password)
    db.session.add(user)
    db.session.commit()
    
    return user

def authenticate_user(identifier, password):
    """Authenticate a user by username or email and return the user object if successful"""
    if '@' in identifier:
        user = User.query.filter_by(email=identifier.strip().lower()).first()
    else:
        user = User.query.filter_by(username=identifier).first()
    if user and verify_password(password, user.password_hash):
        return user
    return None

def get_current_user():
    """Get the current user from JWT token"""
    user_id = get_jwt_identity()
    return User.query.get(user_id) 