"""
Admin mode for the mobile app (there is no user login).

The admin PIN lives only in backend/.env (ADMIN_PIN). The app sends it:
- to POST /api/admin/verify when someone unlocks admin mode, and
- as the X-Admin-Pin header on admin-only actions (e.g. saving settings).
"""
import hmac
import os
import time

from flask import Blueprint, jsonify, request

admin_bp = Blueprint('admin', __name__)

# Brute-force protection: after MAX_FAILURES wrong PINs a client is blocked for LOCKOUT_SECONDS
MAX_FAILURES = 5
LOCKOUT_SECONDS = 300
_failures = {}  # ip -> (count, first_failure_time)


def _client_ip():
    return request.headers.get('X-Forwarded-For', request.remote_addr or 'unknown').split(',')[0].strip()


def _is_locked(ip):
    count, since = _failures.get(ip, (0, 0))
    if count >= MAX_FAILURES and time.time() - since < LOCKOUT_SECONDS:
        return True
    if time.time() - since >= LOCKOUT_SECONDS:
        _failures.pop(ip, None)
    return False


def _record(ip, ok):
    if ok:
        _failures.pop(ip, None)
        return
    count, since = _failures.get(ip, (0, time.time()))
    _failures[ip] = (count + 1, since)


def pin_matches(pin):
    """Constant-time comparison; admin mode is disabled when ADMIN_PIN is not set."""
    expected = os.getenv('ADMIN_PIN', '')
    return bool(expected) and isinstance(pin, str) and hmac.compare_digest(pin.encode(), expected.encode())


def is_admin_request():
    """True when the request carries the correct X-Admin-Pin header (and the client is not locked out)."""
    ip = _client_ip()
    if _is_locked(ip):
        return False
    ok = pin_matches(request.headers.get('X-Admin-Pin', ''))
    if request.headers.get('X-Admin-Pin'):
        _record(ip, ok)
    return ok


@admin_bp.route('/status', methods=['GET'])
def status():
    """Admin-only overview of the SMS alert setup (no secrets are returned)."""
    if not is_admin_request():
        return jsonify({'error': 'Admin PIN required'}), 403

    # Imported here to avoid an import cycle with the route modules
    from services.alert_service import TWILIO_AVAILABLE
    from routes.forecast_routes import alert_service

    configured = all(os.getenv(k) for k in ('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'ALERT_PHONE_NUMBER'))
    return jsonify({
        'sms': {
            'package_installed': TWILIO_AVAILABLE,
            'configured': configured,
            'enabled': bool(alert_service.enabled),
        }
    })


@admin_bp.route('/model', methods=['POST'])
def set_model():
    """Admin-only: choose which landslide model everyone uses."""
    if not is_admin_request():
        return jsonify({'error': 'Admin PIN required'}), 403

    from services.model_registry import registry
    version = (request.get_json(silent=True) or {}).get('version')
    try:
        registry.set_active(version)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    return jsonify({'active': version, 'models': registry.list()})


@admin_bp.route('/verify', methods=['POST'])
def verify():
    ip = _client_ip()
    if _is_locked(ip):
        return jsonify({'error': 'Too many wrong PINs. Try again in a few minutes.'}), 429

    pin = (request.get_json(silent=True) or {}).get('pin', '')
    ok = pin_matches(pin)
    _record(ip, ok)
    return jsonify({'valid': ok})
