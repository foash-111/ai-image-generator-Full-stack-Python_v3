import jwt
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from models import User

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'default-secret-key')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DELTA = timedelta(days=7)

def generate_token(user_id):
    """Generate a JWT token for a user"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + JWT_EXPIRATION_DELTA
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token):
    """Decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_token_from_request():
    """Extract token from request headers"""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header[7:]  # Remove 'Bearer ' prefix
    return None

def get_current_user():
    """Get the current authenticated user"""
    token = get_token_from_request()
    if not token:
        return None
    
    payload = decode_token(token)
    if not payload:
        return None
    
    user_id = payload.get('user_id')
    if not user_id:
        return None
    
    return User.query.get(user_id)


def token_required(f):
    """Decorator to require a valid token for a route"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # ✅ Allow CORS preflight (OPTIONS) requests to pass
        if request.method == "OPTIONS":
            return '', 200

        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401
        
        # Add user to kwargs
        kwargs['current_user'] = user
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator to require an admin user for a route"""
    @wraps(f)
    def decorated(*args, **kwargs):
         # ✅ Allow CORS preflight (OPTIONS) requests to pass
        if request.method == "OPTIONS":
            return '', 200

        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 401
        
        if user.role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin privileges required'
            }), 403
        
        # Add user to kwargs
        kwargs['current_user'] = user
        return f(*args, **kwargs)
    
    return decorated
