import os
from twilio.rest import Client

class AlertService:
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.from_number = os.getenv('TWILIO_PHONE_NUMBER')
        self.alert_number = os.getenv('ALERT_PHONE_NUMBER')
        self.client = Client(self.account_sid, self.auth_token)

    def send_sms(self, message: str, to_number: str = None):
        """Send SMS alert"""
        try:
            to = to_number or self.alert_number
            msg = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to
            )
            print(f"✓ SMS sent: {msg.sid}")
            return True
        except Exception as e:
            print(f"✗ SMS failed: {e}")
            return False

    def send_landslide_alert(self, lat: float, lon: float, risk_score: float, risk_level: str, date: str = None):
        """Send formatted landslide risk alert"""
        message = (
            f"🚨 GEOSAFE LANDSLIDE ALERT\n"
            f"Risk Level: {risk_level}\n"
            f"Risk Score: {risk_score:.1f}%\n"
            f"Location: {lat:.4f}, {lon:.4f}\n"
            f"{'Date: ' + date if date else ''}\n"
            f"Take precautionary measures immediately."
        )
        return self.send_sms(message)