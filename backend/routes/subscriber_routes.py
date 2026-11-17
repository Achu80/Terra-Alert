"""
SMS alert subscriptions.
  POST /api/subscribers              {"phone": "9876543210", "lat": 30.31, "lon": 78.03, "name": "Dehradun"}
  POST /api/subscribers/unsubscribe  {"phone": "9876543210"}
Phone numbers are never returned by any endpoint.
"""
import re
from flask import Blueprint, jsonify, request
from database.repositories import SubscriberRepository

subscriber_bp = Blueprint('subscribers', __name__)
subscriber_repo = SubscriberRepository()

E164 = re.compile(r'^\+[1-9]\d{9,14}$')


def normalize_phone(raw):
    """'98765 43210' -> '+919876543210'. Returns None if it is not a valid number."""
    if not isinstance(raw, str):
        return None
    cleaned = re.sub(r'[\s\-().]', '', raw)
    if re.fullmatch(r'[6-9]\d{9}', cleaned):          # 10-digit Indian mobile
        cleaned = '+91' + cleaned
    elif re.fullmatch(r'0[6-9]\d{9}', cleaned):       # 0 + 10 digits
        cleaned = '+91' + cleaned[1:]
    elif re.fullmatch(r'91[6-9]\d{9}', cleaned):      # 91 + 10 digits, no +
        cleaned = '+' + cleaned
    return cleaned if E164.match(cleaned) else None


@subscriber_bp.route('', methods=['POST'])
def subscribe():
    data = request.get_json(silent=True) or {}
    phone = normalize_phone(data.get('phone'))
    if not phone:
        return jsonify({'error': 'Enter a valid mobile number, e.g. 9876543210 or +919876543210'}), 400
    try:
        lat, lon = float(data.get('lat')), float(data.get('lon'))
    except (TypeError, ValueError):
        return jsonify({'error': 'lat and lon are required'}), 400
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return jsonify({'error': 'lat/lon out of range'}), 400

    name = str(data.get('name') or '').strip()[:80] or None
    try:
        subscriber_repo.add(phone, lat, lon, name)
    except ConnectionError:
        return jsonify({'error': 'Subscriptions are unavailable right now'}), 503
    except Exception as e:
        print(f"Subscribe failed: {e}")
        return jsonify({'error': 'Could not save subscription'}), 500
    return jsonify({'subscribed': True}), 201


@subscriber_bp.route('/unsubscribe', methods=['POST'])
def unsubscribe():
    phone = normalize_phone((request.get_json(silent=True) or {}).get('phone'))
    if not phone:
        return jsonify({'error': 'Enter a valid mobile number'}), 400
    try:
        subscriber_repo.unsubscribe(phone)
    except ConnectionError:
        return jsonify({'error': 'Subscriptions are unavailable right now'}), 503
    except Exception as e:
        print(f"Unsubscribe failed: {e}")
        return jsonify({'error': 'Could not update subscription'}), 500
    return jsonify({'unsubscribed': True})