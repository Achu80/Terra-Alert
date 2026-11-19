"""
Automatic risk check, so alerts go out even when nobody opens the app.

Every ALERT_CHECK_HOURS (default 6) it takes each place that has an active subscriber or phone device,
asks the forecast endpoint for its risk with notifications on, and that endpoint sends SMS and phone
notifications to people within SMS_RADIUS_KM of a place at High risk or above.
"""
import os
import threading
import time

import requests

CHECK_HOURS = float(os.getenv('ALERT_CHECK_HOURS', '6'))
FORECAST_DAYS = int(os.getenv('ALERT_FORECAST_DAYS', '7'))


def active_locations() -> list:
    """Distinct (lat, lon) places with an active subscriber or phone device. Empty if the database is down."""
    from database.supabase_client import get_supabase, is_supabase_available
    if not is_supabase_available():
        return []
    sb = get_supabase()
    places = set()
    for table in ('subscribers', 'push_devices'):
        try:
            rows = sb.table(table).select('lat,lon').eq('active', True).execute().data or []
        except Exception as e:
            print(f"WARNING: alert check could not read {table}: {e}")
            continue
        for r in rows:
            places.add((round(float(r['lat']), 2), round(float(r['lon']), 2)))
    return sorted(places)


def run_once(port: int) -> int:
    places = active_locations()
    for lat, lon in places:
        try:
            requests.post(f'http://127.0.0.1:{port}/api/forecast/predict',
                          json={'lat': lat, 'lon': lon, 'days': FORECAST_DAYS, 'notify': True}, timeout=300)
        except Exception as e:
            print(f"WARNING: alert check failed for {lat}, {lon}: {e}")
    print(f"INFO: automatic alert check done for {len(places)} place(s)")
    return len(places)


def start(port: int) -> None:
    """Start the background check (once). Runs in a daemon thread, so it stops with the server."""
    def loop():
        time.sleep(60)  # let the server finish starting
        while True:
            try:
                run_once(port)
            except Exception as e:
                print(f"WARNING: alert check error: {e}")
            time.sleep(CHECK_HOURS * 3600)

    threading.Thread(target=loop, name='alert-check', daemon=True).start()
    print(f"INFO: automatic alert check every {CHECK_HOURS} hour(s)")
