from flask import Blueprint, request, jsonify
from models import db, User
from utils.auth import generate_token
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
import uuid
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

# Store reset tokens in memory (in a real app, you'd use a database)
password_reset_tokens = {}

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    
    # Validate input
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    if not name or not email or not password:
        return jsonify({
            'success': False,
            'message': 'Name, email, and password are required'
        }), 400
    
    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({
            'success': False,
            'message': 'Email already in use'
        }), 409
    
    # Create new user
    user = User(name=name, email=email, password=password)
    db.session.add(user)
    db.session.commit()
    
    # Generate token
    token = generate_token(user.id)
    
    return jsonify({
        'success': True,
        'message': 'User created successfully',
        'user': user.to_dict(),
        'token': token
    })

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # Validate input
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({
            'success': False,
            'message': 'Email and password are required'
        }), 400
    
    # Find user by email
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({
            'success': False,
            'message': 'email does not exist, please Sign up'
        }), 401
    
    # Verify password
    if not user.check_password(password):
        return jsonify({
            'success': False,
            'message': 'Invalid Password'
        }), 401
    
    # Generate token
    token = generate_token(user.id)
    
    return jsonify({
        'success': True,
        'message': 'Login successful',
        'user': user.to_dict(),
        'token': token
    })

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    data = request.get_json()
    token = data.get('token')
    
    if not token:
        return jsonify({
            'success': False,
            'message': 'Google token is required'
        }), 400
    
    try:
        # Verify Google token
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
        
        # Get user info from token
        email = idinfo.get('email')
        name = idinfo.get('name')
        picture = idinfo.get('picture')
        
        if not email:
            return jsonify({
                'success': False,
                'message': 'Invalid Google token'
            }), 401
        
        # Check if user exists
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Create new user
            user = User(
                name=name or 'Google User',
                email=email,
                password=str(uuid.uuid4()),  # Random password
                avatar_url=picture or '/placeholder.svg'
            )
            db.session.add(user)
            db.session.commit()
        
        # Generate token
        jwt_token = generate_token(user.id)
        
        return jsonify({
            'success': True,
            'message': 'Google authentication successful',
            'user': user.to_dict(),
            'token': jwt_token
        })
    
    except Exception as e:
        print(f"Google auth error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to authenticate with Google'
        }), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({
            'success': False,
            'message': 'Email is required'
        }), 400
    
    # Find user by email
    user = User.query.filter_by(email=email).first()
    if not user:
        # For security reasons, don't reveal that the email doesn't exist
        # Instead, pretend we sent an email
        return jsonify({
            'success': True,
            'message': 'If your email is registered, you will receive reset instructions'
        })
    
    # Generate a secure token
    token = secrets.token_urlsafe(32)
    
    # Store the token with an expiration time (24 hours)
    expiration = datetime.utcnow() + timedelta(hours=24)
    password_reset_tokens[token] = {
        'user_id': user.id,
        'expires': expiration
    }
    
    # In a real application, you would send an email with the reset link
    # For this example, we'll just log it
    host_url = 'http://localhost:3000/'
    reset_link = f"{host_url}reset-password-confirm?token={token}"
    print(f"Password reset link for {email}: {reset_link}")
    
    # Simulate sending an email
    try:
        # This is a placeholder - in a real app, you'd configure your SMTP server
        # send_reset_email(email, reset_link)
        print(f"Would send email to {email} with reset link: {reset_link}")
        send_reset_email(email, reset_link)
        
        return jsonify({
            'success': True,
            'message': 'Password reset instructions sent to your email'
        })
    except Exception as e:
        print(f"Error sending reset email: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to send reset email'
        }), 500

@auth_bp.route('/reset-password-confirm', methods=['POST'])
def reset_password_confirm():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('newPassword')
    
    if not token or not new_password:
        return jsonify({
            'success': False,
            'message': 'Token and new password are required'
        }), 400
    
    # Check if token exists and is valid
    token_data = password_reset_tokens.get(token)
    if not token_data:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 400
    
    # Check if token is expired
    if datetime.utcnow() > token_data['expires']:
        # Remove expired token
        password_reset_tokens.pop(token, None)
        return jsonify({
            'success': False,
            'message': 'Token has expired. Please request a new password reset.'
        }), 400
    
    # Find user
    user = User.query.get(token_data['user_id'])
    if not user:
        return jsonify({
            'success': False,
            'message': 'User not found'
        }), 404
    
    # Update password
    user.set_password(new_password)
    db.session.commit()
    
    # Remove used token
    password_reset_tokens.pop(token, None)
    
    return jsonify({
        'success': True,
        'message': 'Password has been reset successfully'
    })

# Helper function to send reset email (not actually used in this example)
def send_reset_email(email, reset_link):
    # This is a placeholder - in a real app, you'd configure your SMTP server
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.example.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_username = os.getenv('SMTP_USERNAME', 'noreply@example.com')
    smtp_password = os.getenv('SMTP_PASSWORD', 'password')
    
    # Create message
    msg = MIMEMultipart()
    msg['From'] = 'AI Image Generator'
    msg['To'] = email
    msg['Subject'] = 'Password Reset Instructions'
    
    # Create HTML body
    html = f"""
    <html>
    <body>
        <h2>Password Reset</h2>
        <p>You requested a password reset for your AI Image Generator account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="{reset_link}">Reset Password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>The link will expire in 24 hours.</p>
    </body>
    </html>
    """
    
    msg.attach(MIMEText(html, 'html'))
    
    # Send email
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
