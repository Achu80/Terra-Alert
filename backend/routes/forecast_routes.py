from flask import Blueprint, jsonify, request
from services.gee_service import GEEService, RAIN_WINDOWS
from services.model_registry import registry
from utils.data_processor import DataProcessor
import numpy as np
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

DEFAULT_DAYS = 7
MAX_DAYS = 30
WEATHER_FORECAST_DAYS = 16  # longest day-by-day weather forecast Open-Meteo offers
ALERT_DAYS = 7              # only the near days are firm enough to log alerts / send SMS


def _seasonal_rain(lat, lon, days):
    """Seasonal outlook (ECMWF SEAS5 via Open-Meteo): daily rain averaged over all ensemble members.
    A rough guide for days beyond the weather forecast. Returns {date: mm} starting today."""
    params = {'latitude': lat, 'longitude': lon, 'daily': 'precipitation_sum', 'timezone': 'auto', 'forecast_days': days}
    daily = requests.get('https://seasonal-api.open-meteo.com/v1/seasonal', params=params, timeout=20).json()['daily']
    members = [values for key, values in daily.items() if key.startswith('precipitation_sum')]
    by_day = {}
    for i, date in enumerate(daily['time']):
        vals = [m[i] for m in members if i < len(m) and m[i] is not None]
        by_day[date] = sum(vals) / len(vals) if vals else 0.0
    return by_day


def fetch_daily_rain(lat, lon, days=DEFAULT_DAYS):
    """Daily rain (mm) from Open-Meteo (free, no key).
    Returns (past, forecast): the last 30 observed days and `days` days from today, oldest first.
    past is [(date, mm), ...]; forecast is [(date, mm, source), ...] where source is 'forecast'
    (weather forecast, up to 16 days) or 'seasonal' (seasonal outlook for the days after that)."""
    past_days = max(RAIN_WINDOWS)
    params = {
        'latitude': lat, 'longitude': lon, 'daily': 'precipitation_sum', 'timezone': 'auto',
        'past_days': past_days, 'forecast_days': min(days, WEATHER_FORECAST_DAYS),
    }
    daily = requests.get('https://api.open-meteo.com/v1/forecast', params=params, timeout=15).json()['daily']
    series = [(date, float(mm or 0)) for date, mm in zip(daily['time'], daily['precipitation_sum'])]
    past = series[:past_days]
    forecast = [(date, mm, 'forecast') for date, mm in series[past_days:]]

    if days > len(forecast) and forecast:
        try:
            seasonal = _seasonal_rain(lat, lon, days)
            last = datetime.strptime(forecast[-1][0], '%Y-%m-%d')
            for i in range(1, days - len(forecast) + 1):
                date = (last + timedelta(days=i)).strftime('%Y-%m-%d')
                if date not in seasonal:
                    break
                forecast.append((date, float(seasonal[date]), 'seasonal'))
        except Exception as e:
            print(f"⚠ Seasonal rain outlook unavailable: {e}")
    return past, forecast


def forecast_rain_windows(lat, lon, observed, days=DEFAULT_DAYS):
    """Rain windows (3/7/14/30 day totals) for each forecast day, so every day gets its own model input.

    Like training, a day's windows cover the days BEFORE it (not the day itself).
    `observed` holds today's windows from the model's own rain source (GEE), so day 0 (today) uses them as-is.
    For forecast day k each window slides k days forward: the oldest days drop out (their size taken from
    Open-Meteo's past rain) and the forecast days from today up to the day before day k come in.
    Returns [(date, rain_mm, source, {'rainfall_3d': ..., ...}), ...] - source as in fetch_daily_rain.
    """
    past, forecast = fetch_daily_rain(lat, lon, days)
    series = [mm for _, mm, _ in forecast]
    return [(date, rain_mm, source, _slide_windows(observed, past, series, k))
            for k, (date, rain_mm, source) in enumerate(forecast)]


def _slide_windows(observed, past, series, k):
    """Rain windows for forecast day k: today's observed windows slid k days into the daily rain `series`."""
    windows = {}
    for d in RAIN_WINDOWS:
        incoming = sum(series[max(0, k - d):k])
        if k >= d:
            # The whole window is forecast days
            windows[f'rainfall_{d}d'] = incoming
        else:
            dropped = sum(mm for _, mm in past[-d:][:k])
            kept = max(0.0, float(observed.get(f'rainfall_{d}d') or 0) - dropped)
            windows[f'rainfall_{d}d'] = kept + incoming
    return windows


def ensemble_rain_windows(lat, lon, observed, days):
    """Rain windows for every run of the GFS ensemble (31 runs, 35 days - the only free ensemble that covers 30 days).
    One forecast of rain is a single guess; scoring each run and averaging the scores gives the expected risk and
    how sure it is, and keeps heavy-rain spells that an averaged rain forecast would smooth into drizzle.
    Returns {date: [windows per run]} for the next `days` days, or None if the ensemble is unavailable."""
    past_days = max(RAIN_WINDOWS)
    try:
        past_params = {'latitude': lat, 'longitude': lon, 'daily': 'precipitation_sum', 'timezone': 'auto',
                       'past_days': past_days, 'forecast_days': 1}
        past_daily = requests.get('https://api.open-meteo.com/v1/forecast', params=past_params, timeout=15).json()['daily']
        past = [(date, float(mm or 0)) for date, mm in zip(past_daily['time'], past_daily['precipitation_sum'])][:past_days]

        params = {'latitude': lat, 'longitude': lon, 'daily': 'precipitation_sum', 'timezone': 'auto',
                  'forecast_days': days, 'models': 'gfs05'}
        daily = requests.get('https://ensemble-api.open-meteo.com/v1/ensemble', params=params, timeout=20).json()['daily']
        dates = daily['time'][:days]
        runs = [[float(v) for v in values[:days]] for key, values in daily.items()
                if key.startswith('precipitation_sum') and len(values) >= days and None not in values[:days]]
        if not runs:
            return None
        return {date: [_slide_windows(observed, past, run, k) for run in runs] for k, date in enumerate(dates)}
    except Exception as e:
        print(f"⚠ Rain ensemble unavailable, using the single forecast: {e}")
        return None

@forecast_bp.route('/predict', methods=['POST'])
def predict_7day():
    try:
        data = request.json
        lat = data.get('lat')
        lon = data.get('lon')
        # Callers that only display the forecast (mobile app) pass notify=false so no SMS alerts are sent
        notify = data.get('notify', True)
        # How many days ahead (7 / 14 / 30). Beyond 16 days the rain comes from the seasonal outlook
        try:
            days = max(1, min(MAX_DAYS, int(data.get('days', DEFAULT_DAYS))))
        except (TypeError, ValueError):
            days = DEFAULT_DAYS

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

        # Step 2: Rain windows for each day ahead (observed rain rolled forward with the forecast).
        # The single forecast gives the rain shown per day; the ensemble (if available) gives the risk.
        daily_forecast = forecast_rain_windows(lat, lon, gee_data, days)
        ensemble = ensemble_rain_windows(lat, lon, gee_data, days)

        # Step 3: Predict for each day
        results = []

        for i, (date, rain_mm, rain_source, windows) in enumerate(daily_forecast):
            runs = (ensemble or {}).get(date)
            scores = None
            if runs:
                scores = active_model.predict_scores(
                    [data_processor.prepare_model_input({**gee_data, **w}, verbose=False)['features'] for w in runs]
                )
            if scores:
                # Expected risk over all rain scenarios; confidence = share of scenarios at that same level
                score = float(np.mean(scores))
                level = active_model._get_risk_level(score)
                prediction = {
                    'score': round(score, 1),
                    'level': level,
                    'confidence': round(100 * np.mean([active_model._get_risk_level(s) == level for s in scores]), 1),
                }
                risk_range = [round(float(np.percentile(scores, 10)), 1), round(float(np.percentile(scores, 90)), 1)]
            else:
                processed = data_processor.prepare_model_input({**gee_data, **windows})
                if not processed:
                    continue
                prediction = active_model.predict(processed['features'])
                risk_range = None

            results.append({
                'date': date,
                'day': i + 1,
                'rainfall_mm': float(rain_mm),
                'rain_source': rain_source,
                'risk_score': float(prediction['score']),
                'risk_level': prediction['level'],
                'confidence': float(prediction['confidence']),
                # Likely range of the score (10th-90th percentile over the rain scenarios); None without the ensemble
                'risk_range': risk_range,
                'scenarios': len(scores) if scores else 1,
            })

            # Far days are too uncertain to raise alerts on
            if i >= ALERT_DAYS:
                continue

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