from flask import Blueprint, request, jsonify
from models import db, User, Image, UserImage
from utils.auth import token_required
import os
import time
import uuid
import fal_client
import json
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

images_bp = Blueprint('images', __name__)

# Create a thread pool executor for running async code
executor = ThreadPoolExecutor(max_workers=10)

@images_bp.route('', methods=['GET', 'OPTIONS'])
@token_required
def get_images(current_user):
    # Get filter parameter (all, loved, saved)
    filter_param = request.args.get('filter', 'all')
    
    # Query images based on filter
    if filter_param == 'loved':
        user_images = UserImage.query.filter_by(user_id=current_user.id, is_loved=True).all()
    elif filter_param == 'saved':
        user_images = UserImage.query.filter_by(user_id=current_user.id, is_saved=True).all()
    else:
        user_images = UserImage.query.filter_by(user_id=current_user.id).all()
    
    # Get image details
    images = []
    for user_image in user_images:
        image = Image.query.get(user_image.image_id)
        if image:
            image_data = image.to_dict()
            image_data['is_loved'] = user_image.is_loved
            image_data['is_saved'] = user_image.is_saved
            images.append(image_data)
    
    return jsonify({
        'success': True,
        'images': images
    })

@images_bp.route('/<image_id>', methods=['GET'])
@token_required
def get_image(current_user, image_id):
    # Check if user has access to this image
    user_image = UserImage.query.filter_by(user_id=current_user.id, image_id=image_id).first()
    
    if not user_image:
        return jsonify({
            'success': False,
            'message': 'Image not found or you do not have access'
        }), 404
    
    # Get image details
    image = Image.query.get(image_id)
    
    if not image:
        return jsonify({
            'success': False,
            'message': 'Image not found'
        }), 404
    
    image_data = image.to_dict()
    image_data['is_loved'] = user_image.is_loved
    image_data['is_saved'] = user_image.is_saved
    
    return jsonify({
        'success': True,
        'image': image_data
    })


# DELETE:
@images_bp.route('/<image_id>', methods=['DELETE'])
@token_required
def delete_image(current_user, image_id):
    # Check if the user has access to the image
    user_image = UserImage.query.filter_by(user_id=current_user.id, image_id=image_id).first()
    
    if not user_image:
        return jsonify({
            'success': False,
            'message': 'Image not found or you do not have access'
        }), 404

    # Get image details
    image = Image.query.get(image_id)

    if not image:
        return jsonify({
            'success': False,
            'message': 'Image not found'
        }), 404

    try:
        # Delete the image from the database
        db.session.delete(image)
        db.session.commit()

        # Also delete the UserImage relation (if needed)
        db.session.delete(user_image)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Image deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to delete image',
            'error': str(e)
        }), 500


@images_bp.route('/<image_id>/love', methods=['PUT'])
@token_required
def toggle_love_image(current_user, image_id):
    data = request.get_json()
    is_loved = data.get('isLoved', False)
    
    # Check if user has access to this image
    user_image = UserImage.query.filter_by(user_id=current_user.id, image_id=image_id).first()
    
    if not user_image:
        return jsonify({
            'success': False,
            'message': 'Image not found or you do not have access'
        }), 404
    
    # Update is_loved status
    user_image.is_loved = is_loved
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Image {"loved" if is_loved else "unloved"} successfully'
    })

@images_bp.route('/<image_id>/save', methods=['PUT'])
@token_required
def toggle_save_image(current_user, image_id):
    data = request.get_json()
    is_saved = data.get('isSaved', False)
    
    # Check if user has access to this image
    user_image = UserImage.query.filter_by(user_id=current_user.id, image_id=image_id).first()
    
    if not user_image:
        return jsonify({
            'success': False,
            'message': 'Image not found or you do not have access'
        }), 404
    
    # Update is_saved status
    user_image.is_saved = is_saved
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Image {"saved" if is_saved else "unsaved"} successfully'
    })

# Async function to generate image with fal.ai
async def generate_image_async(prompt):
    print(f"Starting async image generation for prompt: {prompt}")
    
    try:
        # Set the FAL_KEY for the client
        fal_key = os.getenv('FAL_KEY')
        if not fal_key:
            print("FAL_KEY environment variable is not set")
            return None
            
        os.environ["FAL_KEY"] = fal_key
        
        # Submit the request to fal.ai
        print(f"Submitting request to fal.ai with prompt: {prompt}")
        handler = await fal_client.submit_async(
            "fal-ai/flux/dev",
            arguments={
                "prompt": prompt,
                "negative_prompt": "blurry, bad quality, distorted, disfigured"
            }
        )
        
        # Wait for the result
        print("Waiting for result...")
        async for event in handler.iter_events(with_logs=True):
            print(f"Event: {event}")
        
        # Get the final result
        result = await handler.get()
        print(f"Result received: {result}")
        
        # Extract the image URL
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
            return None
        
        print(f"Extracted image URL: {image_url}")
        return image_url
    
    except Exception as e:
        print(f"Error in async image generation: {str(e)}")
        return None

# Function to run async code in a thread
def run_async_in_thread(async_func, *args, **kwargs):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(async_func(*args, **kwargs))
        return result
    finally:
        loop.close()

@images_bp.route('/generate', methods=['POST'])
@token_required
def generate_image(current_user):
    data = request.get_json()
    prompt = data.get('prompt')

    if not prompt:
        return jsonify({
            'success': False,
            'message': 'Prompt is required'
        }), 400

    try:
        # Get FAL_KEY from environment
        fal_key = os.getenv('FAL_KEY')
        
        if not fal_key:
            return jsonify({
                'success': False,
                'message': 'FAL_KEY environment variable is not set'
            }), 500
        
        # Set the FAL_KEY for the client
        os.environ["FAL_KEY"] = fal_key
        
        # Submit the task to the executor
        print(f"Submitting task to executor for prompt: {prompt}")
        future = executor.submit(run_async_in_thread, generate_image_async, prompt)
        
        # Wait for the result with a timeout
        try:
            image_url = future.result(timeout=15)  # 2-minute timeout
            print(f"Received image URL from future: {image_url}")
        except Exception as e:
            print(f"Error or timeout in image generation: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Image generation failed: {str(e)}'
            }), 500
        
        if not image_url:
            return jsonify({
                'success': False,
                'message': 'Failed to generate image'
            }), 500
        
        # Create a new image in the database
        try:
            image = Image(image_url=image_url, prompt=prompt)
            db.session.add(image)
            db.session.flush()  # Flush to get the ID
            
            # Create relationship with user
            user_image = UserImage(
                user_id=current_user.id,
                image_id=image.id,
                is_loved=False,
                is_saved=False
            )
            db.session.add(user_image)
            db.session.commit()
            print(f"Image saved to database with ID: {image.id}")
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'Failed to save image to database: {str(db_error)}'
            }), 500
        
        # Return the image URL and ID to the frontend
        return jsonify({
            'success': True,
            'imageUrl': image_url,
            'imageId': image.id,
            'message': 'Image generated successfully'
        })
        
    except Exception as e:
        print(f"Error generating image: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to generate image: {str(e)}'
        }), 500
