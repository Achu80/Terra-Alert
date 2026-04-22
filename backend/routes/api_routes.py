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

@api_bp.route('/districts/himachal', methods=['GET'])
def get_himachal_districts():
    """Get all Himachal Pradesh districts with real-time GEE data (optimized with parallel processing and caching)"""
    try:
        from concurrent.futures import ThreadPoolExecutor, as_completed
        import time
        
        # Check if we should use cache
        use_cache = request.args.get('use_cache', 'true').lower() == 'true'
        force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
        
        # Try to get from cache first (30 minutes max age)
        if use_cache and not force_refresh:
            try:
                from database.cache_repository import DistrictCache
                cache = DistrictCache()
                cached_data = cache.get_all_districts(max_age_minutes=30)
                
                if cached_data:
                    print(f"✅ Returning cached district data ({len(cached_data)} districts)")
                    return jsonify({
                        'districts': cached_data,
                        'count': len(cached_data),
                        'state': 'Himachal Pradesh',
                        'cached': True,
                        'cache_age_minutes': cache.get_cache_age_minutes(),
                        'timestamp': datetime.utcnow().isoformat()
                    })
            except Exception as cache_error:
                print(f"Cache read failed: {cache_error}, fetching fresh data...")
        
        # Himachal Pradesh districts with their coordinates
        HP_DISTRICTS = [
            {"id": "shimla", "name": "Shimla", "lat": 31.1048, "lon": 77.1734},
            {"id": "mandi", "name": "Mandi", "lat": 31.7084, "lon": 76.9318},
            {"id": "kullu", "name": "Kullu", "lat": 31.9578, "lon": 77.1093},
            {"id": "kangra", "name": "Kangra", "lat": 32.0998, "lon": 76.2691},
            {"id": "chamba", "name": "Chamba", "lat": 32.5562, "lon": 76.1262},
            {"id": "hamirpur", "name": "Hamirpur", "lat": 31.6838, "lon": 76.5178},
            {"id": "una", "name": "Una", "lat": 31.4685, "lon": 76.2708},
            {"id": "bilaspur", "name": "Bilaspur", "lat": 31.3409, "lon": 76.7568},
            {"id": "solan", "name": "Solan", "lat": 30.9045, "lon": 77.0967},
            {"id": "sirmaur", "name": "Sirmaur", "lat": 30.5628, "lon": 77.2839},
            {"id": "kinnaur", "name": "Kinnaur", "lat": 31.5830, "lon": 78.3830},
            {"id": "lahaul_spiti", "name": "Lahaul and Spiti", "lat": 32.5667, "lon": 77.1500},
        ]
        
        start_time = time.time()
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        def fetch_district_data(district):
            """Fetch data for a single district"""
            try:
                # Fetch GEE data for district center
                gee_data = gee_service.get_all_features(
                    district['lat'], 
                    district['lon'],
                    start_date.strftime('%Y-%m-%d'),
                    end_date.strftime('%Y-%m-%d'),
                    buffer=5000  # 5km buffer for district center
                )
                
                if gee_data:
                    # Process data
                    processed_data = data_processor.prepare_model_input(gee_data)
                    
                    # Get prediction
                    prediction = model_service.predict(processed_data['features'])
                    
                    # Build district data
                    return {
                        'id': district['id'],
                        'name': district['name'],
                        'lat': district['lat'],
                        'lon': district['lon'],
                        'score': float(prediction['score']),
                        'level': prediction['level'],
                        'confidence': float(prediction['confidence']),
                        'elevation': float(gee_data.get('elevation', 0)),
                        'slope': float(gee_data.get('slope', 0)),
                        'rainfall_30d': float(gee_data.get('rainfall_30d', 0)),
                        'ndvi': float(gee_data.get('ndvi', 0)),
                        'ndwi': float(gee_data.get('ndwi', 0)),
                        'soil_type': int(gee_data.get('soil_type', 0)),
                        'last_updated': datetime.utcnow().isoformat(),
                        'success': True
                    }
                else:
                    # Fallback if GEE data not available
                    return {
                        'id': district['id'],
                        'name': district['name'],
                        'lat': district['lat'],
                        'lon': district['lon'],
                        'score': 0,
                        'level': 'UNKNOWN',
                        'confidence': 0,
                        'error': 'No GEE data available',
                        'success': False
                    }
            except Exception as e:
                print(f"❌ Error fetching data for {district['name']}: {e}")
                return {
                    'id': district['id'],
                    'name': district['name'],
                    'lat': district['lat'],
                    'lon': district['lon'],
                    'score': 0,
                    'level': 'ERROR',
                    'confidence': 0,
                    'error': str(e),
                    'success': False
                }
        
        # Parallel processing - fetch all districts simultaneously
        print(f"🚀 Fetching data for {len(HP_DISTRICTS)} districts in parallel...")
        districts_data = []
        
        with ThreadPoolExecutor(max_workers=6) as executor:
            # Submit all tasks
            future_to_district = {
                executor.submit(fetch_district_data, district): district 
                for district in HP_DISTRICTS
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_district):
                district = future_to_district[future]
                try:
                    result = future.result()
                    districts_data.append(result)
                    if result.get('success'):
                        print(f"✅ {district['name']}: Score {result['score']:.1f}")
                    else:
                        print(f"⚠️  {district['name']}: {result.get('error', 'Unknown error')}")
                except Exception as e:
                    print(f"❌ Exception for {district['name']}: {e}")
                    districts_data.append({
                        'id': district['id'],
                        'name': district['name'],
                        'lat': district['lat'],
                        'lon': district['lon'],
                        'score': 0,
                        'level': 'ERROR',
                        'confidence': 0,
                        'error': str(e),
                        'success': False
                    })
        
        elapsed_time = time.time() - start_time
        print(f"⏱️  Fetched {len(districts_data)} districts in {elapsed_time:.2f} seconds")
        
        # Save to cache for future requests
        if use_cache:
            try:
                from database.cache_repository import DistrictCache
                cache = DistrictCache()
                cache.save_districts(districts_data)
                print("💾 Saved district data to cache")
            except Exception as cache_error:
                print(f"⚠️  Cache save failed: {cache_error}")
        
        return jsonify({
            'districts': districts_data,
            'count': len(districts_data),
            'state': 'Himachal Pradesh',
            'cached': False,
            'fetch_time_seconds': round(elapsed_time, 2),
            'timestamp': datetime.utcnow().isoformat()
        })
    
    except Exception as e:
        import traceback
        print(f"❌ Error in /api/districts/himachal: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


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
        
        # Step 3.5: Save prediction to Supabase (risk_history table)
        try:
            if history_repo.supabase:  # Only if Supabase is available
                # Create a location identifier
                location_name = f"Location ({lat:.4f}, {lon:.4f})"
                
                # Try to get actual location name using reverse geocoding
                try:
                    import requests
                    geocode_url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
                    headers = {'User-Agent': 'GeoSafe-Landslide-Prediction/1.0'}
                    geocode_response = requests.get(geocode_url, headers=headers, timeout=3)
                    
                    if geocode_response.status_code == 200:
                        geocode_data = geocode_response.json()
                        address = geocode_data.get('address', {})
                        
                        # Build a nice location name
                        location_parts = []
                        if address.get('village'):
                            location_parts.append(address['village'])
                        elif address.get('town'):
                            location_parts.append(address['town'])
                        elif address.get('city'):
                            location_parts.append(address['city'])
                        
                        if address.get('state_district'):
                            location_parts.append(address['state_district'])
                        elif address.get('county'):
                            location_parts.append(address['county'])
                        
                        if address.get('state'):
                            location_parts.append(address['state'])
                        
                        if location_parts:
                            location_name = ', '.join(location_parts)
                        else:
                            location_name = geocode_data.get('display_name', location_name).split(',')[0]
                        
                        print(f"📍 Resolved location: {location_name}")
                except Exception as geocode_error:
                    print(f"⚠️  Geocoding failed: {geocode_error}, using coordinates")
                
                # Add location name to features
                features_with_location = processed_data['raw_data'].copy()
                features_with_location['location_name'] = location_name
                features_with_location['lat'] = lat
                features_with_location['lon'] = lon
                
                # Save to risk_history for dashboard display
                history_repo.add_entry(
                    district_id=f"loc_{lat:.4f}_{lon:.4f}",  # Unique ID for this location
                    score=float(prediction['score']),
                    level=prediction['level'],
                    features=features_with_location,
                    model_scores={'xgboost': float(prediction['score'])}
                )
                print(f"💾 Saved prediction to Supabase: {location_name} - Score: {prediction['score']:.1f}")
        except Exception as save_error:
            print(f"⚠️  Failed to save to Supabase: {save_error}")
            # Continue even if save fails
        
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
        # Get prediction statistics from risk_history
        prediction_stats = history_repo.get_prediction_stats()
        
        # Get basic district stats (if any districts exist)
        try:
            district_stats = stats_repo.get_dashboard_stats()
        except:
            district_stats = {
                'total_districts': 0,
                'critical_count': 0,
                'high_count': 0,
                'moderate_count': 0,
                'low_count': 0,
                'avg_risk_score': 0,
                'last_refresh': None
            }
        
        # Initialize response with prediction stats (primary data source)
        response = {
            # Prediction statistics (from all predictions made)
            'total_predictions': prediction_stats['total'],
            'critical_count': prediction_stats['critical'],
            'high_count': prediction_stats['high'],
            'moderate_count': prediction_stats['moderate'],
            'low_count': prediction_stats['low'],
            'avg_risk_score': prediction_stats['avg_score'],
            
            # District statistics (if districts are defined)
            'total_districts': district_stats.get('total_districts', 0),
            'last_refresh': district_stats.get('last_refresh'),
        }
        
        # Try to get additional data
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
            # Get score distribution from predictions
            all_predictions = history_repo.get_all_predictions(limit=1000)
            ranges = {
                '0–20': 0,
                '21–40': 0,
                '41–60': 0,
                '61–80': 0,
                '81–100': 0
            }
            
            for pred in all_predictions:
                score = pred.get('risk_score', 0)
                if score <= 20:
                    ranges['0–20'] += 1
                elif score <= 40:
                    ranges['21–40'] += 1
                elif score <= 60:
                    ranges['41–60'] += 1
                elif score <= 80:
                    ranges['61–80'] += 1
                else:
                    ranges['81–100'] += 1
            
            response['score_distribution'] = [{'range': k, 'count': v} for k, v in ranges.items()]
        except Exception as e:
            print(f"Error getting score distribution: {e}")
            response['score_distribution'] = []
        
        try:
            # Get highest risk from recent predictions
            recent = history_repo.get_recent_predictions(limit=100)
            if recent:
                highest = max(recent, key=lambda x: x.get('score', 0))
                response['highest_risk_location'] = highest.get('location', 'N/A')
                response['highest_risk_score'] = highest.get('score', 0)
            else:
                response['highest_risk_location'] = 'N/A'
                response['highest_risk_score'] = 0
        except Exception as e:
            print(f"Error getting highest risk: {e}")
            response['highest_risk_location'] = 'N/A'
            response['highest_risk_score'] = 0
        
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
