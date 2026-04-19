from flask import Blueprint, jsonify, request
from services.gee_service import GEEService
from services.model_service import ModelService
from utils.data_processor import DataProcessor
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

# Initialize services
gee_project_id = os.getenv('GEE_PROJECT_ID')
gee_service = GEEService(project_id=gee_project_id)
data_processor = DataProcessor()
model_service = ModelService()

# Load ML models on startup
print("Loading ML models...")
model_service.load_models()

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
    Dynamic landslide prediction for ANY location
    User clicks anywhere on map, gets real-time prediction
    
    Request body:
    {
        "lat": 19.0760,
        "lon": 72.8777,
        "days_back": 30,  // optional
        "buffer": 1000,   // optional
        "use_cache": true // optional
    }
    """
    try:
        data = request.json
        lat = data.get('lat')
        lon = data.get('lon')
        
        # Optional parameters
        days_back = data.get('days_back', 30)
        buffer = data.get('buffer', 1000)
        use_cache = data.get('use_cache', True)
        
        if not all([lat, lon]):
            return jsonify({'error': 'Missing lat/lon coordinates'}), 400
        
        # Check cache first (optional but recommended)
        if use_cache:
            try:
                from database.cache_repository import PredictionCache
                cache = PredictionCache()
                cached_result = cache.get_cached(lat, lon, max_age_hours=2)
                
                if cached_result:
                    return jsonify({
                        **cached_result['prediction_data'],
                        'cached': True,
                        'cache_age': cached_result['created_at']
                    })
            except:
                pass  # Cache not available, continue
        
        # Auto-calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Step 1: Fetch ALL features from GEE
        print(f"Fetching GEE data for location: {lat}, {lon}")
        gee_data = gee_service.get_all_features(
            lat, lon,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            buffer
        )
        
        if not gee_data:
            return jsonify({'error': 'No satellite data available for this location'}), 404
        
        # Step 2: Process data for model
        processed_data = data_processor.prepare_model_input(gee_data)
        
        if not processed_data:
            return jsonify({'error': 'Failed to process GEE data'}), 500
        
        # Step 3: Make prediction with ML model
        prediction = model_service.predict(processed_data['features'])
        
        # Build response
        result = {
            'location': {
                'lat': lat,
                'lon': lon
            },
            'date_range': {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d')
            },
            'prediction': {
                'score': prediction['score'],
                'level': prediction['level'],
                'confidence': prediction['confidence']
            },
            'model_scores': prediction['model_scores'],
            'features': {
                'values': processed_data['features'],
                'names': processed_data['feature_names'],
                'normalized': processed_data['normalized_features']
            },
            'derived_features': processed_data['derived_features'],
            'raw_data': processed_data['raw_data'],
            'cached': False,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Add mock indicator if using mock predictions
        if prediction.get('mock'):
            result['warning'] = 'Using mock prediction - ML models not loaded'
        
        # Save to cache for future requests
        if use_cache:
            try:
                cache.save_prediction(lat, lon, result)
            except:
                pass  # Cache save failed, but prediction succeeded
        
        return jsonify(result)
    
    except Exception as e:
        import traceback
        print(f"Error in predict endpoint: {e}")
        print(traceback.format_exc())
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
