from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    tasks = db.relationship('Task', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.username}>'

class Task(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default='medium')
    completed = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(50), default='To Do')
    due_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)

    def __init__(self, task, priority, status, due_date, user_id):
        self.task = task
        self.priority = priority
        self.status = status
        self.due_date = due_date
        self.user_id = user_id

    def to_dict(self):
        return {
            'id': self.id,
            'task': self.task,
            'priority': self.priority,
            'completed': self.completed,
            'status': self.status,
            'dueDate': self.due_date.isoformat() if self.due_date else None,
            'createdAt': self.created_at.isoformat(),
            'userId': self.user_id
        }
    
    def __repr__(self):
        return f'<Task {self.task}>' 

class PasswordResetToken(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(128), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    user = db.relationship('User', backref='reset_tokens') 