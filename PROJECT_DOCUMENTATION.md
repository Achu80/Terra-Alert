# GeoSafe - Landslide Risk Prediction System
## Complete Project Documentation

**Last Updated:** April 21, 2026  
**Project Status:** Backend Complete (100%) | Frontend In Progress (15%)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Setup & Installation](#setup--installation)
5. [Key Components](#key-components)
6. [API Documentation](#api-documentation)
7. [Model Integration](#model-integration)
8. [Database Schema](#database-schema)
9. [Development Timeline](#development-timeline)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)
12. [Future Enhancements](#future-enhancements)

---

## 🎯 Project Overview

**GeoSafe** is an AI-powered landslide risk prediction system that provides real-time risk assessment for any location worldwide using:
- **Google Earth Engine (GEE)** for satellite data
- **XGBoost ML model** for landslide prediction
- **Supabase (PostgreSQL + PostGIS)** for data storage
- **React + Vite** frontend for visualization

### Key Features
✅ **Dynamic Predictions** - Works for ANY location worldwide, not just pre-defined areas  
✅ **Real-time Data** - Fetches live satellite data from Google Earth Engine  
✅ **AI-Powered** - XGBoost model trained on historical landslide data  
✅ **10 Feature Analysis** - Soil, vegetation, rainfall, terrain analysis  
✅ **RESTful API** - Clean Flask API for frontend integration  

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│              React + Vite + Tailwind CSS                     │
│                  (In Development)                            │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────────────┐
│                     BACKEND (Flask)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │   Services   │  │    Utils     │      │
│  │ api_routes.py│  │ gee_service  │  │data_processor│      │
│  │              │  │model_service │  │  mock_data   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────┬───────────────┬──────────────┬─────────────────┘
             │               │              │
    ┌────────▼──────┐ ┌─────▼──────┐ ┌────▼─────────┐
    │ Google Earth  │ │  XGBoost   │ │  Supabase    │
    │    Engine     │ │   Model    │ │  Database    │
    │  (Satellite)  │ │  (AI/ML)   │ │ (PostgreSQL) │
    └───────────────┘ └────────────┘ └──────────────┘
```

---

## 💻 Technology Stack

### Backend
- **Framework:** Flask 3.0.0
- **ML/AI:** XGBoost 3.2.0, scikit-learn 1.8.0, numpy 2.4.4
- **Satellite Data:** Google Earth Engine API 0.1.384
- **Database:** Supabase 2.10.0 (PostgreSQL + PostGIS)
- **Environment:** Python 3.11 + Virtual Environment

### Frontend
- **Framework:** React 19.2.4 + Vite 8.0.4
- **Styling:** Tailwind CSS 3.4.0
- **HTTP Client:** Axios (planned)
- **Maps:** Leaflet/Mapbox (planned)

### AI/ML Module
- **Model:** XGBoost Classifier (200 estimators, max_depth=6)
- **Preprocessing:** StandardScaler
- **Features:** 10 features (soil, vegetation, rainfall, terrain)
- **Format:** JSON (version-independent)

---

## 🚀 Setup & Installation

### Prerequisites
```bash
# Required
- Python 3.11+
- Node.js 18+
- Google Earth Engine account
- Supabase account (optional)
```

### Backend Setup

1. **Create Virtual Environment**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

2. **Install Dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure Environment Variables**
```bash
# Copy .env.example to .env
copy .env.example .env

# Edit .env with your credentials:
GEE_PROJECT_ID=your-gee-project-id
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
```

4. **Authenticate Google Earth Engine**
```bash
earthengine authenticate
earthengine set_project your-gee-project-id
```

5. **Copy Model Files**
```bash
# From ai-module to backend
copy ai-module\xgboost_model.json backend\ml\models\
copy ai-module\scaler_params.json backend\ml\models\
```

6. **Run Backend Server**
```bash
python app.py
# Server runs on http://localhost:5000
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Run Development Server**
```bash
npm run dev
# Server runs on http://localhost:5174
```

---

## 🔑 Key Components

### 1. Google Earth Engine Service (`backend/services/gee_service.py`)

**Purpose:** Fetch real-time satellite data for any location

**Features Extracted:**
1. `soil_type` - Soil classification
2. `ndvi` - Normalized Difference Vegetation Index
3. `ndwi` - Normalized Difference Water Index
4. `rainfall_3d` - 3-day cumulative rainfall
5. `rainfall_7d` - 7-day cumulative rainfall
6. `rainfall_14d` - 14-day cumulative rainfall
7. `rainfall_30d` - 30-day cumulative rainfall
8. `elevation` - Terrain elevation (meters)
9. `slope` - Terrain slope (degrees)
10. `aspect` - Terrain aspect (degrees)

**Key Methods:**
- `get_all_features(lat, lon, start_date, end_date, buffer)` - Fetch all 10 features

**Data Sources:**
- SRTM DEM for elevation/slope/aspect
- CHIRPS for rainfall data
- Sentinel-2 for NDVI/NDWI
- OpenLandMap for soil type

### 2. Model Service (`backend/services/model_service.py`)

**Purpose:** Load XGBoost model and make predictions

**Model Loading:**
- **Primary:** JSON format (version-independent)
- **Fallback:** Pickle format (backward compatibility)

**Scaler Loading:**
- **Primary:** JSON parameters (version-independent)
- **Fallback:** Pickle format

**Prediction Output:**
```json
{
  "score": 9.7,           // Risk score 0-100
  "level": "LOW",         // LOW/MODERATE/HIGH/CRITICAL
  "confidence": 0.95,     // Model confidence
  "prediction_class": 0,  // 0=No landslide, 1=Landslide
  "probabilities": {
    "no_landslide": 0.903,
    "landslide": 0.097
  },
  "model_type": "XGBoost"
}
```

### 3. Data Processor (`backend/utils/data_processor.py`)

**Purpose:** Transform GEE data into model-ready features

**Feature Order (CRITICAL):**
```python
FEATURE_ORDER = [
    'soil_type', 'ndvi', 'ndwi',
    'rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d',
    'elevation', 'slope', 'aspect'
]
```

**Derived Features:**
- `rainfall_intensity` - Daily average rainfall
- `rainfall_acceleration` - Recent vs long-term rainfall ratio
- `slope_category` - gentle/moderate/steep/very_steep
- `vegetation_health` - bare/sparse/moderate/dense
- `soil_saturation` - low/moderate/high

### 4. API Routes (`backend/routes/api_routes.py`)

**Main Endpoint:** `POST /api/predict`

**Request:**
```json
{
  "lat": 28.6139,
  "lon": 77.2090,
  "days_back": 30,      // optional, default 30
  "buffer": 1000,       // optional, default 1000m
  "use_cache": true     // optional, default true
}
```

**Response:**
```json
{
  "location": {"lat": 28.6139, "lon": 77.2090},
  "date_range": {"start": "2026-03-22", "end": "2026-04-21"},
  "prediction": {
    "score": 45.2,
    "level": "MODERATE",
    "confidence": 0.87,
    "prediction_class": 0,
    "probabilities": {"no_landslide": 0.548, "landslide": 0.452},
    "model_type": "XGBoost"
  },
  "features": {
    "values": [5, 0.45, 0.12, 25, 50, 75, 120, 850, 28, 180],
    "names": ["soil_type", "ndvi", "ndwi", ...]
  },
  "derived_features": {
    "rainfall_intensity": 4.0,
    "slope_category": "moderate",
    "vegetation_health": "moderate"
  },
  "timestamp": "2026-04-21T14:30:00Z"
}
```

---

## 📊 Database Schema

### Supabase Tables

**1. districts**
```sql
- id (uuid, primary key)
- name (text)
- geometry (geometry, PostGIS)
- current_risk_level (text)
- last_updated (timestamp)
```

**2. risk_history**
```sql
- id (uuid, primary key)
- district_id (uuid, foreign key)
- risk_score (float)
- risk_level (text)
- prediction_data (jsonb)
- created_at (timestamp)
```

**3. alerts**
```sql
- id (uuid, primary key)
- district_id (uuid, foreign key)
- alert_level (text)
- message (text)
- created_at (timestamp)
- resolved_at (timestamp)
```

**4. prediction_cache**
```sql
- id (uuid, primary key)
- lat (float)
- lon (float)
- prediction_data (jsonb)
- created_at (timestamp)
```

**Note:** Database is currently **not actively used** - predictions are fully dynamic and don't require database storage.

---

## 🤖 Model Integration

### Training Process (ai-module)

**Dataset:** `landslides_combined.csv`
- Landslide events: Historical data from North India
- Non-landslide points: Constrained sampling
- Total samples: ~10,000+ points

**Training Script:** `ai-module/train_xgboost.py`

**Model Performance:**
- Accuracy: ~92%
- Precision: ~89%
- Recall: ~87%
- F1-Score: ~88%
- ROC-AUC: ~0.95

**Saving Format:**
```python
# XGBoost model (version-independent)
model.save_model('xgboost_model.json')

# Scaler parameters (version-independent)
scaler_params = {
    'mean': scaler.mean_.tolist(),
    'scale': scaler.scale_.tolist(),
    'var': scaler.var_.tolist(),
    'n_features': 10,
    'n_samples_seen': 7000
}
json.dump(scaler_params, 'scaler_params.json')
```

### Why JSON Format?

**Problem:** Pickle files have binary incompatibility across:
- Different numpy versions
- Different scikit-learn versions
- Different Python versions
- Different operating systems

**Solution:** JSON format is:
✅ Version-independent  
✅ Human-readable  
✅ Cross-platform compatible  
✅ Smaller file size  

---

## 🧪 Testing

### Test Files

**1. `backend/tests/test_predict_endpoint.py`**
- Tests complete prediction pipeline
- Sends lat/lon → Gets prediction
- Validates response structure

**2. `backend/tests/test_model_loading.py`**
- Tests model and scaler loading
- Verifies XGBoost vs Mock predictions
- Tests prediction variance

**3. `backend/tests/test_gee.py`**
- Tests Google Earth Engine connection
- Validates feature extraction
- Checks data quality

**4. `backend/tests/test_ai_integration.py`**
- End-to-end integration test
- GEE → Processing → Model → Response

### Running Tests

```bash
cd backend

# Test prediction endpoint
python tests/test_predict_endpoint.py

# Test model loading
python tests/test_model_loading.py

# Test GEE service
python tests/test_gee.py

# Full integration test
python tests/test_ai_integration.py
```

---

## 🛠️ Development Timeline

### Phase 1: Backend Setup ✅ (Complete)
- Flask application structure
- Folder organization (services, routes, utils, database, ml, tests)
- Environment configuration
- .gitignore setup

### Phase 2: Google Earth Engine Integration ✅ (Complete)
- GEE authentication and project registration
- GEE service implementation
- 10-feature extraction pipeline
- Real-time satellite data fetching

### Phase 3: Database Setup ✅ (Complete)
- Supabase account creation
- PostgreSQL + PostGIS schema
- Repository layer implementation
- Connection testing
- **Note:** Database optional for dynamic predictions

### Phase 4: AI Model Integration ✅ (Complete)
- Model analysis and feature requirements
- XGBoost model linking from ai-module
- StandardScaler integration
- Version compatibility resolution (pickle → JSON)
- Model service implementation
- Prediction pipeline testing

### Phase 5: API Development ✅ (Complete)
- RESTful API endpoints
- Request/response validation
- Error handling
- Dynamic prediction flow
- Caching system (optional)

### Phase 6: Frontend Setup 🔄 (In Progress - 15%)
- React + Vite project setup
- Tailwind CSS installation and configuration
- Basic UI components
- **Next:** Map integration, API connection

### Phase 7: Frontend Development 📋 (Planned)
- Interactive map (Leaflet/Mapbox)
- Location selection
- Risk visualization
- Real-time predictions
- Historical data charts

### Phase 8: Deployment 📋 (Planned)
- Backend deployment (Heroku/Railway/AWS)
- Frontend deployment (Vercel/Netlify)
- Environment configuration
- CI/CD pipeline

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. **Model Loading Error: "numpy.dtype size changed"**

**Problem:** Binary incompatibility between pickle files

**Solution:**
```bash
# Use JSON format instead of pickle
# In ai-module:
python train_xgboost.py  # Generates JSON files

# Copy to backend:
copy xgboost_model.json backend/ml/models/
copy scaler_params.json backend/ml/models/
```

#### 2. **GEE Error: "Not signed up for Earth Engine"**

**Problem:** GEE not authenticated or project not registered

**Solution:**
```bash
earthengine authenticate
earthengine set_project your-project-id
```

#### 3. **Tailwind CSS Error: "File: index.css:undefined:NaN"**

**Problem:** Tailwind v4 incompatibility with v3 config

**Solution:**
```bash
cd frontend
npm uninstall tailwindcss
npm install -D tailwindcss@^3.4.0
```

#### 4. **Supabase Connection Error**

**Problem:** Missing or incorrect credentials

**Solution:**
```bash
# Check .env file has:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
```

#### 5. **Mock Predictions Instead of XGBoost**

**Problem:** Model not loading properly

**Solution:**
```bash
# Check model files exist:
ls backend/ml/models/
# Should see: xgboost_model.json, scaler_params.json

# Test loading:
python tests/test_model_loading.py
```

---

## 🚀 Future Enhancements

### Short-term (Next Sprint)
- [ ] Complete frontend map integration
- [ ] Connect frontend to backend API
- [ ] Add loading states and error handling
- [ ] Implement risk visualization (heatmaps)
- [ ] Add location search functionality

### Medium-term
- [ ] Historical risk data visualization
- [ ] Multi-location comparison
- [ ] Export reports (PDF/CSV)
- [ ] Email/SMS alerts for high-risk areas
- [ ] Mobile responsive design
- [ ] User authentication

### Long-term
- [ ] Real-time monitoring dashboard
- [ ] Predictive alerts (forecast 7-14 days)
- [ ] Integration with government disaster systems
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Community reporting features
- [ ] Advanced analytics and insights

---

## 📝 Important Notes

### Critical Configuration

**Feature Order Must Match Training:**
```python
# This order is CRITICAL - do not change!
FEATURE_ORDER = [
    'soil_type', 'ndvi', 'ndwi',
    'rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d',
    'elevation', 'slope', 'aspect'
]
```

**Model Files Location:**
```
backend/ml/models/
├── xgboost_model.json    # XGBoost model (JSON format)
├── scaler_params.json    # StandardScaler parameters (JSON)
├── xgboost_model.pkl     # Backup (pickle format)
└── scaler.pkl            # Backup (pickle format)
```

**Environment Variables:**
```bash
# Required for GEE
GEE_PROJECT_ID=your-project-id

# Optional for Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
```

### Data Flow

```
User clicks location (lat, lon)
    ↓
Frontend sends POST /api/predict
    ↓
Backend calculates date range (last 30 days)
    ↓
GEE Service fetches 10 features
    ↓
Data Processor prepares model input
    ↓
Model Service applies StandardScaler
    ↓
XGBoost predicts landslide probability
    ↓
Response sent to frontend
    ↓
Frontend displays risk level + visualization
```

---

## 📞 Contact & Support

**Project:** GeoSafe - Landslide Risk Prediction  
**Repository:** D:\VS-Code projects\GeoSafe  
**Documentation:** This file + backend/docs/  

**Key Documentation Files:**
- `PROJECT_DOCUMENTATION.md` - This file (complete overview)
- `backend/docs/README.md` - Backend-specific docs
- `backend/docs/AI_INTEGRATION.md` - Model integration guide
- `backend/docs/SUPABASE_SETUP.md` - Database setup guide
- `backend/docs/INTEGRATION_GUIDE.md` - API integration guide

---

## ✅ Project Status Summary

| Component | Status | Progress |
|-----------|--------|----------|
| Backend API | ✅ Complete | 100% |
| GEE Integration | ✅ Complete | 100% |
| AI Model | ✅ Complete | 100% |
| Database | ✅ Complete | 100% |
| Testing | ✅ Complete | 100% |
| Frontend Setup | 🔄 In Progress | 15% |
| Frontend UI | 📋 Planned | 0% |
| Deployment | 📋 Planned | 0% |
| **Overall** | **🔄 In Progress** | **~55%** |

---

**Last Updated:** April 21, 2026  
**Version:** 1.0  
**Status:** Backend Complete, Frontend In Development
