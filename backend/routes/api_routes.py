from flask import Blueprint, jsonify, request
from services.gee_service import GEEService
from utils.data_processor import DataProcessor
from utils.mock_data import get_mock_prediction
from database.repositories import (
    DistrictRepository, 
    RiskHistoryRepository, 
    AlertRepository, 
    SettingsRepository,
    StatsRepository
)
from datetime import datetime, timedelta
import os

api_bp = Blueprint('api', __name__)

# Check if mock mode is enabled
MOCK_MODE = os.getenv('MOCK_MODE', 'false').lower() == 'true'

# Initialize services
gee_project_id = os.getenv('GEE_PROJECT_ID')
gee_service = GEEService(project_id=gee_project_id) if not MOCK_MODE else None
data_processor = DataProcessor()

# Initialize repositories
district_repo = DistrictRepository()
history_repo = RiskHistoryRepository()
alert_repo = AlertRepository()
settings_repo = SettingsRepository()
stats_repo = StatsRepository()

@api_bp.route('/health')
def health():
    """API health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'mock_mode': MOCK_MODE
    })

@api_bp.route('/districts', methods=['GET'])
def get_districts():
    """Get all districts with current risk data"""
    try:
        districts = district_repo.get_all()
        return jsonify({'districts': districts, 'count': len(districts)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/districts/<district_id>', methods=['GET'])
def get_district(district_id):
    """Get single district details"""
    try:
        district = district_repo.get_by_id(district_id)
        if not district:
            return jsonify({'error': 'District not found'}), 404
        return jsonify(district)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    Dynamic prediction for ANY location
    User clicks anywhere on map, gets real-time prediction
    """
    try:
        data = request.json
        lat = data.get('lat')
        lon = data.get('lon')
        
        # Optional parameters
        days_back = data.get('days_back', 30)
        buffer = data.get('buffer', 1000)
        use_cache = data.get('use_cache', True)  # Enable caching by default
        
        if not all([lat, lon]):
            return jsonify({'error': 'Missing lat/lon coordinates'}), 400
        
        # Check cache first (optional but recommended)
        if use_cache:
            from database.cache_repository import PredictionCache
            cache = PredictionCache()
            cached_result = cache.get_cached(lat, lon, max_age_hours=2)
            
            if cached_result:
                return jsonify({
                    **cached_result['prediction_data'],
                    'cached': True,
                    'cache_age': cached_result['created_at']
                })
        
        # Auto-calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Step 1: Fetch live GEE data for this exact location
        print(f"Fetching GEE data for location: {lat}, {lon}")
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
        # from services.model_service import ModelService
        # model_service = ModelService()
        # prediction = model_service.predict(processed_data['features'])
        
        # For now, return mock prediction based on features
        # You can replace this with real model later
        mock_score = min(100, max(0, sum(processed_data['features'][:3]) * 10))
        mock_level = 'CRITICAL' if mock_score >= 80 else 'HIGH' if mock_score >= 60 else 'MODERATE' if mock_score >= 40 else 'LOW'
        
        result = {
            'location': {'lat': lat, 'lon': lon},
            'date_range': {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d')
            },
            'prediction': {
                'score': round(mock_score, 1),
                'level': mock_level,
                'confidence': 0.85  # Mock confidence
            },
            'features': processed_data['features'],
            'feature_names': processed_data['feature_names'],
            'raw_data': processed_data['raw_data'],
            'cached': False
        }
        
        # Save to cache for future requests
        if use_cache:
            cache.save_prediction(lat, lon, result)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/alerts', methods=['GET'])
def get_alerts():
    """Get recent alerts"""
    try:
        limit = request.args.get('limit', 10, type=int)
        level = request.args.get('level', None)
        
        alerts = alert_repo.get_recent_alerts(limit=limit, level=level)
        return jsonify({'alerts': alerts, 'count': len(alerts)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/history/<district_id>', methods=['GET'])
def get_history(district_id):
    """Get risk history for a district"""
    try:
        from_date = request.args.get('from')
        to_date = request.args.get('to')
        
        history = history_repo.get_history(district_id, from_date, to_date)
        return jsonify({'history': history, 'count': len(history)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get aggregate statistics"""
    try:
        stats = stats_repo.get_dashboard_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/settings', methods=['GET', 'POST'])
def settings():
    """Get or update settings"""
    try:
        if request.method == 'GET':
            settings = settings_repo.get_settings()
            return jsonify(settings)
        else:
            data = request.json
            updated = settings_repo.update_settings(data)
            return jsonify(updated)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
