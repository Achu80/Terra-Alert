import os
import uuid
from flask import Blueprint, request, jsonify
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

from datetime import datetime, timedelta
from routes.forecast_routes import forecast_rain_windows, gee_service, data_processor
from services.model_registry import registry

chatbot_bp = Blueprint('chatbot', __name__)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """
You are GeoSafe's assistant for a landslide early-warning system in North India.
Answer first-aid questions with a landslide-emergency focus (crush injury, burial,
debris trauma, fire/burns from ruptured gas lines, evacuation) unless the user
clearly asks something unrelated. Always advise contacting emergency services
(108/112) for serious injuries.

You can also answer questions about a location's landslide risk data using tools:
- get_terrain_parameters: current elevation, slope, vegetation (NDVI), soil type,
  and rainfall totals for a location.
- get_landslide_forecast: 7-day rainfall and predicted risk score/level for a location.
Use the location from the user's context if they don't specify coordinates.
When reporting risk scores or rainfall figures, state the numbers plainly and
mention the date range they cover.
"""
import requests

from math import radians, sin, cos, sqrt, atan2

def haversine_distance(lat1, lon1, lat2, lon2):
    """Distance in km between two lat/lon points."""
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

def find_nearest_hospital(lat: float, lon: float) -> list:
    """Find the nearest hospitals to a given latitude and longitude using OpenStreetMap data.
    Returns a list of up to 5 hospitals sorted by distance, each with name, lat, lon, and distance_km.

    Args:
        lat: Latitude of the location to search near.
        lon: Longitude of the location to search near.
    """
    radius = 10000
    overpass_url = "https://overpass-api.de/api/interpreter"
    query = f"""
    [out:json];
    node["amenity"="hospital"](around:{radius},{lat},{lon});
    out body 10;
    """
    headers = {'User-Agent': 'GeoSafe-LandslideApp/1.0 (student project)'}
    response = requests.post(overpass_url, data={'data': query}, headers=headers)
    data = response.json()

    hospitals = []
    for el in data.get('elements', []):
        name = el.get('tags', {}).get('name', 'Unnamed Hospital')
        h_lat, h_lon = el['lat'], el['lon']
        distance = haversine_distance(lat, lon, h_lat, h_lon)
        hospitals.append({
            'name': name,
            'lat': h_lat,
            'lon': h_lon,
            'distance_km': round(distance, 2)
        })

    hospitals.sort(key=lambda h: h['distance_km'])
    return hospitals[:5]

def get_route(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> dict:
    """Get driving route and travel time between two points using OSRM.
    Returns distance in km, duration in minutes, and a summary.

    Args:
        origin_lat: Latitude of starting point.
        origin_lon: Longitude of starting point.
        dest_lat: Latitude of destination.
        dest_lon: Longitude of destination.
    """
    osrm_url = (
        f"http://router.project-osrm.org/route/v1/driving/"
        f"{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
        f"?overview=false"
    )
    response = requests.get(osrm_url)
    data = response.json()

    if data.get('code') != 'Ok':
        return {'error': 'Route not found'}

    route = data['routes'][0]
    distance_km = round(route['distance'] / 1000, 2)
    duration_min = round(route['duration'] / 60, 1)

    return {
        'distance_km': distance_km,
        'duration_min': duration_min
    }

def get_landslide_forecast(lat: float, lon: float) -> list:
    """Get a 7-day landslide risk forecast for a location, including daily
    rainfall and predicted risk score/level for each of the next 7 days.

    Args:
        lat: Latitude of the location.
        lon: Longitude of the location.
    """
    active_model = registry.active()
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
        gee_data = {
            'elevation': 700, 'slope': 25, 'aspect': 180,
            'ndvi': 0.4, 'ndwi': -0.1, 'soil_type': 3,
            'rainfall_3d': 0, 'rainfall_7d': 0,
            'rainfall_14d': 0, 'rainfall_30d': 0
        }

    daily_forecast = forecast_rain_windows(lat, lon, gee_data)

    results = []

    for i, (date, rain_mm, windows) in enumerate(daily_forecast):
        processed = data_processor.prepare_model_input({**gee_data, **windows})
        if not processed:
            continue

        prediction = active_model.predict(processed['features'])
        results.append({
            'date': date,
            'day': i + 1,
            'rainfall_mm': round(float(rain_mm), 1),
            'risk_score': float(prediction['score']),
            'risk_level': prediction['level']
        })

    return results

def get_terrain_parameters(lat: float, lon: float) -> dict:
    """Get current terrain and environmental parameters for a location:
    elevation, slope, aspect, vegetation index (NDVI), water index (NDWI),
    soil type, and cumulative rainfall over 3/7/14/30 days.

    Args:
        lat: Latitude of the location.
        lon: Longitude of the location.
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    gee_data = gee_service.get_all_features(
        lat, lon,
        start_date.strftime('%Y-%m-%d'),
        end_date.strftime('%Y-%m-%d'),
        1000,
        **registry.active().feature_options
    )
    return gee_data or {'error': 'Terrain data unavailable for this location'}

active_chats = {}

@chatbot_bp.route('/chatbot', methods=['POST'])
def chatbot():
    data = request.get_json()
    user_message = data.get('message', '')
    session_id = data.get('session_id')
    context = data.get('context')

    if not session_id or session_id not in active_chats:
        session_id = session_id or str(uuid.uuid4())
        active_chats[session_id] = client.chats.create(
            model="gemini-3.5-flash-lite",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[find_nearest_hospital, get_route, get_landslide_forecast, get_terrain_parameters]
            )
        )

    chat = active_chats[session_id]

    if context and context.get('latitude'):
        context_note = (
            f"[Context: user has selected location "
            f"{context.get('location_name', 'Unknown')} "
            f"({context['latitude']}, {context['longitude']}), "
            f"risk score {context.get('risk_score', 'N/A')}%, "
            f"risk level {context.get('risk_level', 'N/A')}. "
            f"Use this location if the user asks about nearby hospitals or routes.]\n\n"
        )
        full_message = context_note + user_message
    else:
        full_message = user_message


    try:
        response = chat.send_message(full_message)
        reply_text = response.text
    except Exception as e:
        error_str = str(e)
        if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
            reply_text = "I'm getting a lot of requests right now. Please try again in a moment."
        else:
            reply_text = "Something went wrong processing your request. Please try again."
        print(f"Chatbot error: {error_str}")  # server-side log for debugging

    return jsonify({
        "reply": reply_text,
        "session_id": session_id
    })
