"""
Phone notification devices.
  POST /api/push/register    {"token": "ExponentPushToken[...]", "lat": 32.24, "lon": 77.19, "name": "Manali"}
  POST /api/push/unregister  {"token": "ExponentPushToken[...]"}
Tokens are never returned by any endpoint.
"""
import re
from flask import Blueprint, jsonify, request
from database.repositories import PushRepository

push_bp = Blueprint('push', __name__)
push_repo = PushRepository()

# Expo tokens look like ExponentPushToken[xxxx] or ExpoPushToken[xxxx]
TOKEN = re.compile(r'^Expo(nent)?PushToken\[[A-Za-z0-9_\-]+\]$')


@push_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    token = str(data.get('token') or '').strip()
    if not TOKEN.match(token):
        return jsonify({'error': 'Invalid notification token'}), 400
    try:
        lat, lon = float(data.get('lat')), float(data.get('lon'))
    except (TypeError, ValueError):
        return jsonify({'error': 'lat and lon are required'}), 400
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return jsonify({'error': 'lat/lon out of range'}), 400
    name = str(data.get('name') or '').strip()[:80] or None
    # 60 = High and above (people living there); 80 = Critical only (visitors planning a trip)
    min_score = data.get('min_score', 60)
    if min_score not in (60, 80):
        return jsonify({'error': 'min_score must be 60 or 80'}), 400
    try:
        push_repo.register(token, lat, lon, name, min_score)
    except ConnectionError:
        return jsonify({'error': 'Notifications are unavailable right now'}), 503
    except Exception as e:
        print(f"Push register failed: {e}")
        return jsonify({'error': 'Could not save notification settings'}), 500
    return jsonify({'registered': True}), 201


@push_bp.route('/unregister', methods=['POST'])
def unregister():
    token = str((request.get_json(silent=True) or {}).get('token') or '').strip()
    if not TOKEN.match(token):
        return jsonify({'error': 'Invalid notification token'}), 400
    try:
        push_repo.unregister(token)
    except ConnectionError:
        return jsonify({'error': 'Notifications are unavailable right now'}), 503
    except Exception as e:
        print(f"Push unregister failed: {e}")
        return jsonify({'error': 'Could not update notification settings'}), 500
    return jsonify({'unregistered': True})
