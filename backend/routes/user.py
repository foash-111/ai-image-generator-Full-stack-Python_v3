from flask import Blueprint, request, jsonify
from models import db, User, UserImage
from utils.auth import token_required
import base64
import os
import uuid

user_bp = Blueprint('user', __name__)

@user_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify({
        'success': True,
        'user': current_user.to_dict()
    })

@user_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json()
    print(data)

    # Update fields if provided
    if 'name' in data:
        current_user.name = data['name']

    if data.get('avatarUrl'):
        # Check if the avatar_url is a base64 string or a URL
        avatar_url = data['avatarUrl']
        
        # If it's a fal.ai URL, just store it directly
        if avatar_url and (avatar_url.startswith('https://') or avatar_url.startswith('https://')):
            current_user.avatar_url = avatar_url
        # If it's a base64 string, process it as before
        elif avatar_url and avatar_url.startswith('data:image'):
            try:
                # Extract the base64 data
                format, imgstr = avatar_url.split(';base64,')
                ext = format.split('/')[-1]
                
                # Create a unique filename
                filename = f"avatar_{current_user.id}_{uuid.uuid4()}.{ext}"
                filepath = os.path.join('static', 'avatars', filename)
                
                # Ensure the directory exists
                os.makedirs(os.path.join('static', 'avatars'), exist_ok=True)
                
                # Save the image
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(imgstr))
                
                # Update the avatar URL to point to the saved file
                current_user.avatar_url = f"/static/avatars/{filename}"
            except Exception as e:
                print(f"Error saving avatar: {str(e)}")
                return jsonify({
                    'success': False,
                    'message': f'Failed to save avatar: {str(e)}'
                }), 500

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Profile updated successfully',
        'user': current_user.to_dict()
    })

@user_bp.route('/password', methods=['PUT'])
@token_required
def update_password(current_user):
    data = request.get_json()

    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')

    if not current_password or not new_password:
        return jsonify({
            'success': False,
            'message': 'Current password and new password are required'
        }), 400

    # Verify current password
    if not current_user.check_password(current_password):
        return jsonify({
            'success': False,
            'message': 'Current password is incorrect'
        }), 401

    # Update password
    current_user.set_password(new_password)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Password updated successfully'
    })

@user_bp.route('/account', methods=['DELETE'])
@token_required
def delete_account(current_user):
    # Check if user is admin
    if current_user.role == 'admin':
        return jsonify({
            'success': False,
            'message': 'Admin accounts cannot be deleted through this endpoint'
        }), 403

    # Delete user's relationships with images
    UserImage.query.filter_by(user_id=current_user.id).delete()

    # Delete user
    db.session.delete(current_user)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Account deleted successfully'
    })
