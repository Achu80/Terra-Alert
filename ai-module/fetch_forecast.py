import requests
import pandas as pd
from datetime import datetime

def get_7day_rainfall(lat, lon, api_key):
    """Fetch 7-day rainfall forecast and aggregate by day"""
    url = f"http://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    
    response = requests.get(url)
    data = response.json()
    
    # Aggregate 3-hour forecasts into daily totals
    daily_rain = {}
    for item in data['list'][:56]:  # 7 days * 8 (3-hour intervals)
        date = item['dt_txt'].split()[0]  # Extract date
        rain = item.get('rain', {}).get('3h', 0)  # 3-hour rainfall
        daily_rain[date] = daily_rain.get(date, 0) + rain
    
    # Calculate cumulative windows
    rain_values = list(daily_rain.values())[:7]
    
    return {
        'rainfall_3d': sum(rain_values[:3]),
        'rainfall_7d': sum(rain_values[:7])
    }

# Test
API_KEY = "3351d9ba25e20ade8767a4c2dcb02922"
result = get_7day_rainfall(30.0668, 79.0193, API_KEY)
print("7-Day Forecast:", result)