# Frontend Integration Guide

## Complete Flow

```
Frontend (User clicks map) 
    ↓
    Sends: { lat, lon }
    ↓
Backend receives location
    ↓
Auto-fetches GEE satellite data (last 30 days)
    ↓
Extracts & processes features (bands + indices)
    ↓
Feeds to ML model
    ↓
Returns prediction to frontend
```

## API Endpoint

**POST** `/api/predict`

### Request (from Frontend)
```json
{
  "lat": 40.7128,
  "lon": -74.0060
}
```

Optional parameters:
```json
{
  "lat": 40.7128,
  "lon": -74.0060,
  "days_back": 30,    // How many days of data to fetch (default: 30)
  "buffer": 1000      // Radius in meters (default: 1000)
}
```

### Response (to Frontend)
```json
{
  "location": {
    "lat": 40.7128,
    "lon": -74.0060
  },
  "date_range": {
    "start": "2026-03-19",
    "end": "2026-04-18"
  },
  "features": [0.234, 0.456, ...],
  "feature_names": ["B2", "B3", "B4", "B8", "B11", "B12", "NDVI", "NDWI"],
  "prediction": "Prediction result here"
}
```

## Frontend Example (JavaScript/React)

```javascript
async function getPrediction(lat, lon) {
  const response = await fetch('http://localhost:5000/api/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lat, lon })
  });
  
  const result = await response.json();
  return result;
}

// Usage
const result = await getPrediction(40.7128, -74.0060);
console.log('Prediction:', result.prediction);
```

## What Happens Automatically

1. Backend calculates date range (last 30 days by default)
2. Fetches Sentinel-2 satellite data from GEE
3. Filters cloudy images
4. Extracts spectral bands (B2, B3, B4, B8, B11, B12)
5. Calculates vegetation indices (NDVI, NDWI)
6. Normalizes all values
7. Feeds to model (when implemented)
8. Returns prediction

## Next Steps

1. Train your ML model with these features
2. Implement model loading in `model_service.py`
3. Frontend just needs to send coordinates
4. Everything else is handled automatically
