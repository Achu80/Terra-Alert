# AI Module Integration Guide

## Overview

The AI module is now fully integrated with the backend. Here's how it works:

```
User clicks location (lat, lon)
    ↓
GEE fetches 13 features
    ↓
Data processor prepares features
    ↓
ML model predicts landslide risk
    ↓
Return prediction to user
```

## Features Extracted from GEE

### 1. Rainfall (CHIRPS Dataset)
- `rainfall_1d` - 24-hour precipitation (mm)
- `rainfall_3d` - 3-day cumulative (mm)
- `rainfall_7d` - Weekly cumulative (mm)
- `rainfall_30d` - Monthly cumulative (mm)

### 2. Terrain (SRTM DEM)
- `elevation_mean` - Average elevation (meters)
- `slope_mean` - Average slope angle (degrees)
- `slope_max` - Maximum slope angle (degrees)
- `aspect_mean` - Terrain aspect (0-360°)
- `curvature_mean` - Terrain curvature

### 3. Vegetation (Sentinel-2)
- `ndvi` - Normalized Difference Vegetation Index (-1 to 1)
- `ndwi` - Normalized Difference Water Index (-1 to 1)

### 4. Population (WorldPop)
- `population_density` - People per km²

### 5. Soil (OpenLandMap)
- `soil_type_class` - USDA soil texture class (0-12)

## Testing the Integration

### Test 1: Complete Pipeline Test

```bash
cd backend
python tests/test_ai_integration.py
```

This tests:
- ✓ GEE data fetching
- ✓ Feature processing
- ✓ Model loading
- ✓ Prediction generation

### Test 2: API Endpoint Test

```bash
# Start server
python app.py

# In another terminal
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"lat": 19.0760, "lon": 72.8777}'
```

Expected response:
```json
{
  "location": {"lat": 19.076, "lon": 72.8777},
  "prediction": {
    "score": 65.3,
    "level": "HIGH",
    "confidence": 0.82
  },
  "model_scores": {
    "rf": 67.1,
    "adaboost": 63.5,
    "bagging": 65.3,
    "ensemble": 65.3
  },
  "features": {
    "values": [12.5, 45.2, ...],
    "names": ["rainfall_1d", "rainfall_3d", ...]
  }
}
```

## Adding Your Trained Models

### Step 1: Train Your Models

Train 3 models using scikit-learn:
- Random Forest
- AdaBoost
- Bagging

### Step 2: Save Models

```python
import joblib

# After training
joblib.dump(rf_model, 'backend/ml/models/rf.pkl')
joblib.dump(ada_model, 'backend/ml/models/adaboost.pkl')
joblib.dump(bag_model, 'backend/ml/models/bagging.pkl')
```

### Step 3: Restart Server

```bash
python app.py
```

Models will load automatically on startup.

## Current Status

### ✓ Working
- GEE data fetching (all 13 features)
- Feature processing and normalization
- Model service infrastructure
- API endpoint `/api/predict`
- Mock predictions (when models not available)

### ⚠ Pending
- Trained ML models (.pkl files)
- Model training script
- Historical training data

## Mock Predictions

Until you add trained models, the system uses intelligent mock predictions based on:
- Rainfall intensity
- Slope steepness
- Vegetation cover

Mock predictions are clearly marked in the response:
```json
{
  "warning": "Using mock prediction - ML models not loaded"
}
```

## Next Steps

1. **Collect Training Data**
   - Historical landslide events
   - Corresponding GEE features
   - Labels (landslide/no landslide)

2. **Train Models**
   - Use collected data
   - Train RF, AdaBoost, Bagging
   - Evaluate performance

3. **Deploy Models**
   - Save as .pkl files
   - Place in `backend/ml/models/`
   - Restart server

4. **Test with Real Models**
   - Run integration test
   - Verify predictions
   - Tune ensemble weights

## API Usage Examples

### Basic Prediction

```python
import requests

response = requests.post('http://localhost:5000/api/predict', json={
    'lat': 19.0760,
    'lon': 72.8777
})

result = response.json()
print(f"Risk Score: {result['prediction']['score']}")
print(f"Risk Level: {result['prediction']['level']}")
```

### With Custom Parameters

```python
response = requests.post('http://localhost:5000/api/predict', json={
    'lat': 19.0760,
    'lon': 72.8777,
    'days_back': 60,      # Look back 60 days
    'buffer': 2000,       # 2km radius
    'use_cache': False    # Force fresh data
})
```

### Get Feature Importance

```python
response = requests.get('http://localhost:5000/api/model/feature-importance')
importance = response.json()

# Shows which features matter most
# e.g., {"rainfall_7d": 0.25, "slope_max": 0.18, ...}
```

## Troubleshooting

**Error: "No models found"**
- Models not in `backend/ml/models/` folder
- System will use mock predictions
- Train and save models to fix

**Error: "No satellite data available"**
- Location might be over ocean
- Date range might be too old
- Try different location or dates

**Slow predictions (>15 seconds)**
- GEE data fetching takes time
- Enable caching: `"use_cache": true`
- Cached predictions return instantly

## Performance

- **First prediction**: 10-15 seconds (GEE fetch)
- **Cached prediction**: <100ms
- **Cache duration**: 2 hours
- **GEE rate limit**: ~1000 requests/day

## Architecture

```
backend/
├── services/
│   ├── gee_service.py       # ✓ Fetches all 13 features
│   └── model_service.py     # ✓ ML prediction engine
├── utils/
│   └── data_processor.py    # ✓ Feature processing
├── ml/
│   └── models/              # → Add your .pkl files here
├── routes/
│   └── api_routes.py        # ✓ /api/predict endpoint
└── tests/
    └── test_ai_integration.py  # ✓ Integration test
```

## Summary

✓ **Backend**: Fully integrated with GEE and AI module
✓ **GEE**: Fetching all required features
✓ **Processing**: Features prepared for model
✓ **API**: Working endpoint for predictions
⚠ **Models**: Using mocks until you add trained models
❌ **Frontend**: Not built yet

The backend is ready! Just add your trained models and it will work with real predictions.
