from flask import Blueprint, jsonify, request
from services.gee_service import GEEService, RAIN_WINDOWS
from services.model_registry import registry
from utils.data_processor import DataProcessor
import requests
from datetime import datetime, timedelta
import os
from services.alert_service import AlertService
from database.repositories import AlertRepository
alert_service = AlertService()
alert_repo = AlertRepository()
forecast_bp = Blueprint('forecast', __name__)

gee_service = GEEService(project_id=os.getenv('GEE_PROJECT_ID'))
data_processor = DataProcessor()

FORECAST_DAYS = 7

def fetch_daily_rain(lat, lon):
    """Daily rain (mm) from Open-Meteo (free, no key, true 7-day forecast).
    Returns (past, forecast): the last 30 observed days and today + the next 6 days, each [(date, mm), ...] oldest first."""
    past_days = max(RAIN_WINDOWS)
    params = {
        'latitude': lat, 'longitude': lon, 'daily': 'precipitation_sum', 'timezone': 'auto',
        'past_days': past_days, 'forecast_days': FORECAST_DAYS,
    }
    daily = requests.get('https://api.open-meteo.com/v1/forecast', params=params, timeout=15).json()['daily']
    days = [(date, float(mm or 0)) for date, mm in zip(daily['time'], daily['precipitation_sum'])]
    return days[:past_days], days[past_days:]


def forecast_rain_windows(lat, lon, observed):
    """Rain windows (3/7/14/30 day totals) for each forecast day, so every day gets its own model input.

    `observed` holds today's windows from the model's own rain source (GEE), covering the days before today.
    For forecast day k each window slides k+1 days forward: the oldest days drop out (their size taken from
    Open-Meteo's past rain) and the forecast days up to and including day k come in.
    Returns [(date, rain_mm, {'rainfall_3d': ..., ...}), ...].
    """
    past, forecast = fetch_daily_rain(lat, lon)
    days = []
    for k, (date, rain_mm) in enumerate(forecast):
        windows = {}
        for d in RAIN_WINDOWS:
            incoming = sum(mm for _, mm in forecast[max(0, k + 1 - d):k + 1])
            if k + 1 >= d:
                # The whole window is forecast days
                windows[f'rainfall_{d}d'] = incoming
            else:
                dropped = sum(mm for _, mm in past[-d:][:k + 1])
                kept = max(0.0, float(observed.get(f'rainfall_{d}d') or 0) - dropped)
                windows[f'rainfall_{d}d'] = kept + incoming
        days.append((date, rain_mm, windows))
    return days

@forecast_bp.route('/predict', methods=['POST'])
def predict_7day():
    try:
        data = request.json
        lat = data.get('lat')
        lon = data.get('lon')
        # Callers that only display the forecast (mobile app) pass notify=false so no SMS alerts are sent
        notify = data.get('notify', True)

        if not all([lat, lon]):
            return jsonify({'error': 'Missing lat/lon'}), 400

        # One model for the whole request, fed the rain data it was trained on
        active_model = registry.active()

        # Step 1: Get terrain features from GEE (static)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        gee_data = gee_service.get_all_features(
            lat, lon,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            1000,
            **active_model.feature_options
        )
        if not gee_data:
            print("⚠ GEE unavailable, using mock terrain data")
            gee_data = {
                'elevation': 700, 'slope': 25, 'aspect': 180,
                'ndvi': 0.4, 'ndwi': -0.1, 'soil_type': 3,
                'rainfall_3d': 0, 'rainfall_7d': 0,
                'rainfall_14d': 0, 'rainfall_30d': 0
            }

        # Step 2: Rain windows for each of the next 7 days (observed rain rolled forward with the forecast)
        daily_forecast = forecast_rain_windows(lat, lon, gee_data)

        # Step 3: Predict for each day
        results = []

        for i, (date, rain_mm, windows) in enumerate(daily_forecast):
            processed = data_processor.prepare_model_input({**gee_data, **windows})
            if not processed:
                continue

            prediction = active_model.predict(processed['features'])
            results.append({
                'date': date,
                'day': i + 1,
                'rainfall_mm': float(rain_mm),
                'risk_score': float(prediction['score']),
                'risk_level': prediction['level'],
                'confidence': float(prediction['confidence'])
            })

            # Alert log for the app (separate from SMS below): forecast days at Moderate and above
            day_level = str(prediction['level']).upper()
            if day_level in ('MODERATE', 'HIGH', 'CRITICAL'):
                alert_repo.record_alert_once(
                    district_id=f"loc_{float(lat):.4f}_{float(lon):.4f}",
                    level=day_level,
                    score=float(prediction['score']),
                    trigger=f"Forecast for {date}"
                )

            if notify and prediction['score'] >= 3:
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