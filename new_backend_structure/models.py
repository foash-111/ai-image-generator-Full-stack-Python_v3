from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid
import bcrypt

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    avatar_url = db.Column(db.Text, default='/placeholder.svg')
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_images = db.relationship('UserImage', backref='user', lazy=True, cascade='all, delete-orphan')

    def __init__(self, name, email, password, role='user', avatar_url='/placeholder.svg'):
        self.id = str(uuid.uuid4())
        self.name = name
        self.email = email
        self.set_password(password)
        self.role = role
        self.avatar_url = avatar_url

    def set_password(self, password):
        self.password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))

    def to_dict(self, exclude_password=True):
        data = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'avatar_url': self.avatar_url,
            'role': self.role,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        if not exclude_password:
            data['password'] = self.password
        return data

class Image(db.Model):
    __tablename__ = 'images'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    image_url = db.Column(db.Text, nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_images = db.relationship('UserImage', backref='image', lazy=True, cascade='all, delete-orphan')

    def __init__(self, image_url, prompt):
        self.id = str(uuid.uuid4())
        self.image_url = image_url
        self.prompt = prompt

    def to_dict(self):
        return {
            'id': self.id,
            'image_url': self.image_url,
            'prompt': self.prompt,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class UserImage(db.Model):
    __tablename__ = 'user_images'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    image_id = db.Column(db.String(36), db.ForeignKey('images.id'), nullable=False)
    is_loved = db.Column(db.Boolean, default=False)
    is_saved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'image_id', name='uix_user_image'),
    )

    def __init__(self, user_id, image_id, is_loved=False, is_saved=False):
        self.id = str(uuid.uuid4())
        self.user_id = user_id
        self.image_id = image_id
        self.is_loved = is_loved
        self.is_saved = is_saved

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'image_id': self.image_id,
            'is_loved': self.is_loved,
            'is_saved': self.is_saved,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }