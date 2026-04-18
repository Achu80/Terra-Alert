from flask import Blueprint, jsonify, request
from services.gee_service import GEEService
from utils.data_processor import DataProcessor
from datetime import datetime, timedelta
import os

api_bp = Blueprint('api', __name__)

# Initialize services
gee_project_id = os.getenv('GEE_PROJECT_ID')
gee_service = GEEService(project_id=gee_project_id)
data_processor = DataProcessor()

@api_bp.route('/health')
def health():
    return jsonify({'status': 'healthy'})

@api_bp.route('/gee/data', methods=['POST'])
def get_gee_data():
    """Fetch GEE data for given coordinates and date range"""
    try:
        data = request.json
        lat = data.get('lat')
        lon = data.get('lon')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        buffer = data.get('buffer', 1000)
        
        if not all([lat, lon, start_date, end_date]):
            return jsonify({'error': 'Missing required parameters'}), 400
        
        gee_data = gee_service.get_satellite_data(lat, lon, start_date, end_date, buffer)
        
        if not gee_data:
            return jsonify({'error': 'No data found for the specified parameters'}), 404
        
        return jsonify({'data': gee_data})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/gee/process', methods=['POST'])
def process_gee_data():
    """Fetch GEE data and prepare it for model input"""
    try:
        data = request.json
        lat = data.get('lat')
        lon = data.get('lon')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        buffer = data.get('buffer', 1000)
        
        if not all([lat, lon, start_date, end_date]):
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Fetch GEE data
        gee_data = gee_service.get_satellite_data(lat, lon, start_date, end_date, buffer)
        
        if not gee_data:
            return jsonify({'error': 'No data found'}), 404
        
        # Process for model input
        processed_data = data_processor.prepare_model_input(gee_data)
        
        return jsonify(processed_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/predict', methods=['POST'])
def predict():
    """
    Complete pipeline: location -> GEE data -> model prediction
    Frontend only needs to send location coordinates
    """
    try:
        data = request.json
        lat = data.get('lat')
        lon = data.get('lon')
        
        # Optional parameters with defaults
        days_back = data.get('days_back', 30)  # Default: last 30 days
        buffer = data.get('buffer', 1000)  # Default: 1km radius
        
        if not all([lat, lon]):
            return jsonify({'error': 'Missing lat/lon coordinates'}), 400
        
        # Auto-calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Step 1: Fetch GEE data
        gee_data = gee_service.get_satellite_data(
            lat, lon,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            buffer
        )
        
        if not gee_data:
            return jsonify({'error': 'No satellite data available for this location'}), 404
        
        # Step 2: Process data for model
        processed_data = data_processor.prepare_model_input(gee_data)
        
        # Step 3: Make prediction (TODO: implement when model is ready)
        # prediction = model_service.predict(processed_data['features'])
        
        # Return everything for now
        return jsonify({
            'location': {'lat': lat, 'lon': lon},
            'date_range': {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d')
            },
            'features': processed_data['features'],
            'feature_names': processed_data['feature_names'],
            'raw_data': processed_data['raw_data'],
            'prediction': 'Model not implemented yet'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
