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
import numpy as np

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
        'timestamp': datetime.utcnow().isoformat()
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
        
        # Step 4: Generate forecast for 7, 14, and 30 days
        forecast_7d = generate_forecast(processed_data['raw_data'], days=7, base_score=prediction['score'])
        forecast_14d = generate_forecast(processed_data['raw_data'], days=14, base_score=prediction['score'])
        forecast_30d = generate_forecast(processed_data['raw_data'], days=30, base_score=prediction['score'])
        
        # Convert all numpy types to Python native types
        def convert_to_native(obj):
            """Recursively convert numpy types to Python native types"""
            if isinstance(obj, (np.integer, np.int32, np.int64, np.int16, np.int8)):
                return int(obj)
            elif isinstance(obj, (np.floating, np.float32, np.float64, np.float16)):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return [convert_to_native(item) for item in obj.tolist()]
            elif isinstance(obj, dict):
                return {key: convert_to_native(value) for key, value in obj.items()}
            elif isinstance(obj, (list, tuple)):
                return [convert_to_native(item) for item in obj]
            else:
                return obj
        
        # Build response with type conversion
        result = {
            'location': {
                'lat': float(lat),
                'lon': float(lon)
            },
            'date_range': {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d')
            },
            'prediction': convert_to_native(prediction),
            'features': {
                'values': convert_to_native(processed_data['features']),
                'names': processed_data['feature_names']
            },
            'derived_features': convert_to_native(processed_data['derived_features']),
            'raw_data': convert_to_native(processed_data['raw_data']),
            'forecast': {
                '7days': forecast_7d,
                '14days': forecast_14d,
                '30days': forecast_30d
            },
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
        error_details = {
            'error': str(e),
            'type': type(e).__name__,
            'traceback': traceback.format_exc()
        }
        print(f"❌ Error in predict endpoint: {e}")
        print(f"Error type: {type(e).__name__}")
        print(traceback.format_exc())
        return jsonify({'error': str(e), 'details': str(type(e).__name__)}), 500


def generate_forecast(raw_data, days=7, base_score=50):
    """
    Generate risk forecast for future days based on current conditions
    This is a simplified forecast - in production, you'd use weather forecast data
    
    Args:
        raw_data: Dictionary of raw GEE data (not the feature vector)
        days: Number of days to forecast
        base_score: Current risk score to base forecast on
    """
    import random
    from datetime import datetime, timedelta
    
    forecast = []
    current_date = datetime.now()
    
    # Safely extract key features that affect forecast
    try:
        rainfall_30d = float(raw_data.get('rainfall_30d', 100))
    except (ValueError, TypeError):
        rainfall_30d = 100
    
    try:
        slope = float(raw_data.get('slope', 20))
    except (ValueError, TypeError):
        slope = 20
    
    try:
        ndvi = float(raw_data.get('ndvi', 0.5))
    except (ValueError, TypeError):
        ndvi = 0.5
    
    # Base trend: slight increase if high rainfall, decrease if low
    trend = 0.5 if rainfall_30d > 150 else -0.3
    
    # Seasonal factor (monsoon months have higher risk)
    current_month = current_date.month
    monsoon_factor = 1.2 if current_month in [6, 7, 8, 9] else 1.0
    
    for i in range(days):
        date = current_date + timedelta(days=i+1)
        
        # Add some randomness and trend
        variation = random.uniform(-5, 5)
        trend_effect = trend * i * 0.5
        
        # Calculate forecasted score
        score = base_score + trend_effect + variation
        score = score * monsoon_factor
        
        # Keep within bounds
        score = max(0, min(100, score))
        
        # Determine risk level
        if score >= 80:
            level = 'CRITICAL'
        elif score >= 60:
            level = 'HIGH'
        elif score >= 40:
            level = 'MODERATE'
        else:
            level = 'LOW'
        
        forecast.append({
            'date': date.strftime('%Y-%m-%d'),
            'day': date.strftime('%b %d'),
            'score': round(score, 1),
            'level': level,
            'confidence': round(max(50, 95 - i * 2), 1)  # Confidence decreases over time
        })
    
    return forecast

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
    """Get aggregate statistics with enhanced dashboard data"""
    try:
        # Get basic stats
        stats = stats_repo.get_dashboard_stats()
        
        # Initialize response with basic stats
        response = {
            'total_districts': stats.get('total_districts', 0),
            'critical_count': stats.get('critical_count', 0),
            'high_count': stats.get('high_count', 0),
            'moderate_count': stats.get('moderate_count', 0),
            'low_count': stats.get('low_count', 0),
            'avg_risk_score': stats.get('avg_risk_score', 0),
            'last_refresh': stats.get('last_refresh'),
        }
        
        # Try to get additional data, but don't fail if it's not available
        try:
            response['recent_predictions'] = history_repo.get_recent_predictions(limit=8)
        except Exception as e:
            print(f"Error getting recent predictions: {e}")
            response['recent_predictions'] = []
        
        try:
            response['trend_7d'] = history_repo.get_7day_trend()
        except Exception as e:
            print(f"Error getting 7-day trend: {e}")
            response['trend_7d'] = []
        
        try:
            response['score_distribution'] = stats_repo.get_score_distribution()
        except Exception as e:
            print(f"Error getting score distribution: {e}")
            response['score_distribution'] = []
        
        try:
            highest_risk = district_repo.get_highest_risk_district()
            response['highest_risk_location'] = highest_risk.get('name', 'N/A') if highest_risk else 'N/A'
        except Exception as e:
            print(f"Error getting highest risk district: {e}")
            response['highest_risk_location'] = 'N/A'
        
        try:
            response['total_predictions'] = stats_repo.get_total_predictions()
        except Exception as e:
            print(f"Error getting total predictions: {e}")
            response['total_predictions'] = 0
        
        return jsonify(response)
    except Exception as e:
        import traceback
        print(f"Error in /api/stats: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api_bp.route('/predictions', methods=['GET'])
def get_predictions():
    """Get recent predictions"""
    try:
        limit = request.args.get('limit', 8, type=int)
        predictions = history_repo.get_recent_predictions(limit=limit)
        return jsonify({'predictions': predictions, 'count': len(predictions)})
    except Exception as e:
        import traceback
        print(f"Error in /api/predictions: {e}")
        print(traceback.format_exc())
        return jsonify({'predictions': [], 'count': 0, 'error': str(e)}), 200

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
