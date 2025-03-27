from flask import Blueprint, request, jsonify
from models import db, Image, ImageRequest, UserImage
import os
import time
import json
import hmac
import hashlib

webhooks_bp = Blueprint('webhooks', __name__)

# Helper function to verify webhook signature
def verify_webhook_signature(request_data, signature_header):
    # This is a placeholder - you would implement proper signature verification
    # based on fal.ai's webhook signature method
    webhook_secret = os.getenv('FAL_WEBHOOK_SECRET', '')
    
    if not webhook_secret:
        # For development, you might skip verification
        return True
    
    # Example implementation (adjust based on fal.ai's actual signature method)
    computed_signature = hmac.new(
        webhook_secret.encode('utf-8'),
        request_data,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(computed_signature, signature_header)

@webhooks_bp.route('/fal-ai', methods=['POST'])
def fal_ai_webhook():
    # Get the raw request data for signature verification
    request_data = request.get_data()
    signature_header = request.headers.get('X-Fal-Signature', '')
    
    # Verify the webhook signature (optional but recommended for production)
    # if not verify_webhook_signature(request_data, signature_header):
    #     return jsonify({
    #         'success': False,
    #         'message': 'Invalid webhook signature'
    #     }), 401
    
    # Parse the JSON data
    data = request.get_json()
    print(f"Received webhook from fal.ai: {data}")
    
    # Extract the request ID and result
    request_id = data.get('request_id')
    result = data.get('result')
    error = data.get('error')
    
    if not request_id:
        print("No request_id in webhook data")
        return jsonify({
            'success': False,
            'message': 'Missing request_id'
        }), 400
    
    # Find the corresponding image request
    image_request = ImageRequest.query.filter_by(request_id=request_id).first()
    
    if not image_request:
        print(f"No image request found for request_id: {request_id}")
        return jsonify({
            'success': False,
            'message': 'Image request not found'
        }), 404
    
    # Handle error case
    if error:
        print(f"Error in fal.ai response: {error}")
        image_request.status = 'failed'
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Error status recorded'
        })
    
    # Handle success case
    try:
        # Extract the image URL from the result
        image_url = None
        
        # Try to extract the image URL based on different possible formats
        if isinstance(result, dict) and 'images' in result and len(result['images']) > 0:
            # Format: {'images': [{'url': '...'}]}
            image_url = result['images'][0].get('url')
        elif hasattr(result, 'images') and len(result.images) > 0:
            # Format: result.images[0].url
            image_url = result.images[0].url if hasattr(result.images[0], 'url') else None
        elif hasattr(result, 'image_url'):
            # Format: result.image_url
            image_url = result.image_url
        
        if not image_url:
            print("Could not extract image URL from result")
            image_request.status = 'failed'
            db.session.commit()
            return jsonify({
                'success': False,
                'message': 'No image URL found in the result'
            }), 500
        
        print(f"Extracted image URL: {image_url}")
        
        # Create a new image
        image = Image(image_url=image_url, prompt=image_request.prompt)
        db.session.add(image)
        db.session.flush()  # Flush to get the ID
        
        # Create relationship with user
        user_image = UserImage(
            user_id=image_request.user_id,
            image_id=image.id,
            is_loved=False,
            is_saved=False
        )
        db.session.add(user_image)
        
        # Update the image request
        image_request.status = 'completed'
        image_request.image_id = image.id
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Image created successfully'
        })
    
    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        image_request.status = 'failed'
        db.session.commit()
        return jsonify({
            'success': False,
            'message': f'Error processing webhook: {str(e)}'
        }), 500
