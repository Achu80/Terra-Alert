import os
import uuid
from flask import Blueprint, request, jsonify
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

chatbot_bp = Blueprint('chatbot', __name__)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """
You are GeoSafe's assistant for a landslide early-warning system in North India.
Answer first-aid questions with a landslide-emergency focus (crush injury, burial,
debris trauma, fire/burns from ruptured gas lines, evacuation) unless the user
clearly asks something unrelated. Always advise contacting emergency services
(108/112) for serious injuries.
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
            model="gemini-3.6-flash",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[find_nearest_hospital]
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

    response = chat.send_message(full_message)

    return jsonify({
        "reply": response.text,
        "session_id": session_id
    })

