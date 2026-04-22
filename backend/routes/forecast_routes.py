from flask import Blueprint, jsonify, request
from services.gee_service import GEEService
from services.model_service import ModelService
from utils.data_processor import DataProcessor
import requests
from datetime import datetime, timedelta
import os
from services.alert_service import AlertService
alert_service = AlertService()
forecast_bp = Blueprint('forecast', __name__)

gee_service = GEEService(project_id=os.getenv('GEE_PROJECT_ID'))
model_service = ModelService()
model_service.load_models()
data_processor = DataProcessor()

OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '3351d9ba25e20ade8767a4c2dcb02922')

def fetch_7day_forecast(lat, lon):
    url = f"http://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    response = requests.get(url)
    data = response.json()
    
    daily_rain = {}
    for item in data['list'][:56]:
        date = item['dt_txt'].split()[0]
        rain = item.get('rain', {}).get('3h', 0)
        daily_rain[date] = daily_rain.get(date, 0) + rain
    
    return list(daily_rain.items())[:7]  # [(date, mm), ...]

@forecast_bp.route('/predict', methods=['POST'])
def predict_7day():
    try:
        data = request.json
        lat = data.get('lat')
        lon = data.get('lon')
        
        if not all([lat, lon]):
            return jsonify({'error': 'Missing lat/lon'}), 400

        # Step 1: Get terrain features from GEE (static)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        gee_data = gee_service.get_all_features(
            lat, lon,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            1000
        )
        if not gee_data:
            print("⚠ GEE unavailable, using mock terrain data")
            gee_data = {
                'elevation': 700, 'slope': 25, 'aspect': 180,
                'ndvi': 0.4, 'ndwi': -0.1, 'soil_type': 3,
                'rainfall_3d': 0, 'rainfall_7d': 0,
                'rainfall_14d': 0, 'rainfall_30d': 0
            }

        # Step 2: Get 7-day rainfall forecast
        daily_forecast = fetch_7day_forecast(lat, lon)

        # Step 3: Predict for each day
        results = []
        cumulative_rain = 0
        rain_history = []

        for i, (date, rain_mm) in enumerate(daily_forecast):
            rain_history.append(rain_mm)
            cumulative_rain += rain_mm

            # Override rainfall in gee_data with forecast values
            gee_data['rainfall_3d'] = sum(rain_history[-3:])
            gee_data['rainfall_7d'] = sum(rain_history)
            gee_data['rainfall_14d'] = gee_data.get('rainfall_14d', cumulative_rain)
            gee_data['rainfall_30d'] = gee_data.get('rainfall_30d', cumulative_rain)

            processed = data_processor.prepare_model_input(gee_data)
            if not processed:
                continue

            prediction = model_service.predict(processed['features'])
            results.append({
                'date': date,
                'day': i + 1,
                'rainfall_mm': float(rain_mm),
                'risk_score': float(prediction['score']),
                'risk_level': prediction['level'],
                'confidence': float(prediction['confidence'])
            })

            if prediction['score'] >= 3:
                alert_service.send_landslide_alert(
                    lat=lat,
                    lon=lon,
                    risk_score=float(prediction['score']),
                    risk_level=prediction['level'],
                    date=date
    )

        return jsonify({
            'location': {'lat': lat, 'lon': lon},
            'forecast': results,
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500