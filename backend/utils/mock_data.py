"""
Mock data for fast development
Returns instant responses without calling GEE or heavy processing
"""
import random

def get_mock_gee_data(lat, lon):
    """Return mock GEE satellite data instantly"""
    return {
        'B2': random.uniform(1000, 3000),
        'B3': random.uniform(1000, 3000),
        'B4': random.uniform(1000, 3000),
        'B8': random.uniform(3000, 5000),
        'B11': random.uniform(2000, 4000),
        'B12': random.uniform(1500, 3500)
    }

def get_mock_prediction(lat, lon):
    """Return mock prediction instantly"""
    # Generate consistent but varied mock data based on location
    seed = int((lat + lon) * 1000)
    random.seed(seed)
    
    score = random.uniform(30, 95)
    level = 'CRITICAL' if score >= 80 else 'HIGH' if score >= 60 else 'MODERATE' if score >= 40 else 'LOW'
    
    return {
        'location': {'lat': lat, 'lon': lon},
        'prediction': {
            'score': round(score, 1),
            'level': level,
            'confidence': round(random.uniform(0.75, 0.95), 2)
        },
        'features': [
            round(random.uniform(0, 1), 3) for _ in range(8)
        ],
        'feature_names': ['B2', 'B3', 'B4', 'B8', 'B11', 'B12', 'NDVI', 'NDWI'],
        'mock': True,
        'message': 'Mock data - set MOCK_MODE=false for real GEE data'
    }
