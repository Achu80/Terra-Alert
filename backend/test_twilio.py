from dotenv import load_dotenv
load_dotenv()

from services.alert_service import AlertService

alert = AlertService()
result = alert.send_landslide_alert(
    lat=30.3165,
    lon=78.0322,
    risk_score=85.0,
    risk_level="HIGH",
    date="2026-04-22"
)

print("Alert sent!" if result else "Alert failed!")