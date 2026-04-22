# GeoSafe Quick Start Guide

## ✅ What We've Built

A complete landslide risk prediction system for Himachal Pradesh with:
- **Backend**: Flask API with ML model integration
- **Frontend**: React dashboard with real-time data
- **Database**: Supabase (optional - works without it)

## 🚀 Start the Application

### Step 1: Start Backend

Open **Command Prompt** (not PowerShell):

```bash
cd "D:\VS-Code projects\GeoSafe\backend"
python app.py
```

You should see:
```
⚠ Warning: Missing Supabase credentials (SUPABASE_URL or SUPABASE_SERVICE_KEY)
  Backend will run with limited functionality (no database)
Loading ML models...
 * Running on http://127.0.0.1:5000
```

**This is OK!** The backend will work with empty data until you configure Supabase.

### Step 2: Start Frontend

The frontend should already be running on `http://localhost:5173`

If not, open another Command Prompt:

```bash
cd "D:\VS-Code projects\GeoSafe\frontend"
npm run dev
```

### Step 3: View the Dashboard

Open your browser and go to: **http://localhost:5173**

You should see the GeoSafe dashboard with:
- ✅ 0 districts monitored (empty state)
- ✅ No active alerts message
- ✅ All UI components working
- ✅ Beautiful glass morphism design

## 📊 How It Works Now

### Without Supabase (Current State)
- Dashboard shows zeros and empty states
- All UI components work perfectly
- Backend returns empty data gracefully
- No errors or crashes

### With Supabase (After Configuration)
- Real data from database
- Live predictions
- Historical trends
- Alert notifications

## 🔧 Next Steps

### 1. Configure Supabase (Optional)

Edit `backend/.env`:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
GEE_PROJECT_ID=your_google_earth_engine_project
```

### 2. Make Your First Prediction

Once backend is running, test the prediction endpoint:

```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"lat": 31.1048, "lon": 77.1734}'
```

This will:
- Fetch satellite data from Google Earth Engine
- Run the XGBoost model
- Return landslide risk prediction
- Store in database (if Supabase configured)

### 3. Populate the Dashboard

Make several predictions for different locations in Himachal Pradesh:
- Shimla: 31.1048, 77.1734
- Manali: 32.2432, 77.1892
- Dharamshala: 32.2190, 76.3234

The dashboard will automatically update with:
- Total predictions count
- Risk distribution
- Recent predictions table
- 7-day trend chart

## 🐛 Troubleshooting

### Backend won't start
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend shows connection error
- Make sure backend is running on port 5000
- Check browser console for errors
- Verify `http://localhost:5000/api/health` returns JSON

### Port 5000 already in use
Edit `backend/app.py`, change:
```python
app.run(debug=True, port=5001)  # Use 5001 instead
```

Then update frontend API calls to use port 5001.

## 📁 Project Structure

```
GeoSafe/
├── backend/
│   ├── app.py              # Flask server
│   ├── routes/
│   │   └── api_routes.py   # API endpoints
│   ├── database/
│   │   └── repositories.py # Database operations
│   └── services/
│       └── model_service.py # ML model
├── frontend/
│   └── src/
│       ├── App.jsx         # Main app
│       ├── pages/
│       │   ├── HomePage.jsx      # Dashboard
│       │   └── DashboardPage.jsx # Analytics
│       └── components/     # UI components
└── ai-module/
    └── train_xgboost.py    # Model training
```

## 🎯 Key Features

✅ Real-time landslide risk prediction
✅ Interactive dashboard with metrics
✅ Custom charts (no external libraries)
✅ Glass morphism design
✅ Himachal Pradesh focused
✅ Works offline (without database)
✅ Graceful error handling
✅ Auto-refresh every 30 seconds

## 📞 Need Help?

Check these files:
- `backend/START_BACKEND.md` - Detailed backend setup
- `backend/docs/` - API documentation
- `frontend/README.md` - Frontend details
