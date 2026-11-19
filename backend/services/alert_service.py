import os
import time

# Make Twilio optional
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    print("WARNING: Twilio not installed. SMS alerts will be disabled.")

# Remembers when each person was last texted about each place:
# {"+919876543210|30.32,78.03": unix_time}   (in memory - resets when the backend restarts)
_last_sent = {}


class AlertService:
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.from_number = os.getenv('TWILIO_PHONE_NUMBER')
        # Admin / test number. Used by test_twilio.py, and as the only recipient
        # if the subscribers database is unreachable.
        self.alert_number = os.getenv('ALERT_PHONE_NUMBER')
        # Don't text the same person about the same place again within this many hours
        self.cooldown_hours = float(os.getenv('SMS_COOLDOWN_HOURS', '6'))
        # Text subscribers whose saved place is within this distance of the risky place
        self.radius_km = float(os.getenv('SMS_RADIUS_KM', '10'))

        if TWILIO_AVAILABLE and self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
            self.enabled = True
        else:
            self.client = None
            self.enabled = False
            if not TWILIO_AVAILABLE:
                print("WARNING: SMS alerts disabled: Twilio not installed")
            else:
                print("WARNING: SMS alerts disabled: Twilio credentials not configured")

    def send_sms(self, message: str, to_number: str = None):
        """Send one SMS. Returns True/False."""
        if not self.enabled:
            print(f"INFO: SMS alert skipped (disabled): {message[:50]}...")
            return False

        try:
            to = to_number or self.alert_number
            msg = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to
            )
            print(f"SMS sent: {msg.sid}")
            return True
        except Exception as e:
            print(f"SMS failed: {e}")
            return False

    def _cooldown_key(self, phone: str, lat: float, lon: float) -> str:
        return f"{phone}|{float(lat):.2f},{float(lon):.2f}"

    def _in_cooldown(self, phone: str, lat: float, lon: float) -> bool:
        last = _last_sent.get(self._cooldown_key(phone, lat, lon))
        return last is not None and (time.time() - last) < self.cooldown_hours * 3600

    def _recipients(self, lat: float, lon: float) -> list:
        """Registered subscribers near this place."""
        try:
            from database.repositories import SubscriberRepository
            phones = SubscriberRepository().find_near(lat, lon, self.radius_km)
        except Exception as e:
            print(f"WARNING: could not load subscribers: {e}")
            phones = None
        if phones is None:  # database unavailable -> fall back to the admin number
            return [self.alert_number] if self.alert_number else []
        return phones

    def send_landslide_alert(self, lat: float, lon: float, risk_score: float, risk_level: str, date: str = None):
        """Send one alert to the admin/test number (no cooldown - used for manual tests)"""
        message = (
            f"TERRA ALERT: Landslide risk {risk_level} "
            f"(score {risk_score:.0f}/100) near {lat:.4f}, {lon:.4f}"
            f"{' on ' + date if date else ''}. "
            f"Stay away from slopes and follow local authority advice."
        )
        return self.send_sms(message)

    def send_forecast_alert(self, lat: float, lon: float, days: list) -> int:
        """Send ONE summary SMS per registered subscriber near this place.
        days = [(date, score, level), ...]. Returns how many people were texted."""
        if not days:
            return 0

        worst = max(days, key=lambda d: d[1])
        others = [d for d in days if d is not worst][:2]
        message = (
            f"TERRA ALERT: Landslide risk {worst[2]} "
            f"(score {worst[1]:.0f}/100) near {float(lat):.4f}, {float(lon):.4f} "
            f"on {worst[0]}."
        )
        if others:
            message += " Also risky: " + ", ".join(f"{d[0]} ({d[2]})" for d in others) + "."
        message += " Stay away from slopes and follow local authority advice."

        sent = 0
        for phone in self._recipients(lat, lon):
            if self._in_cooldown(phone, lat, lon):
                continue
            if self.send_sms(message, to_number=phone):
                _last_sent[self._cooldown_key(phone, lat, lon)] = time.time()
                sent += 1
        print(f"INFO: forecast alert for {lat}, {lon}: {sent} SMS sent")
        return sent