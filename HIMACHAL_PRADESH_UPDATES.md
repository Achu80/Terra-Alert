# Himachal Pradesh Region Lock & Dynamic District Data

## Summary of Changes

This update restricts the entire application to Himachal Pradesh region and replaces all static data with dynamic data fetched from Google Earth Engine (GEE) and the ML model.

---

## 1. Map Region Lock (Himachal Pradesh Only)

### Himachal Pradesh Bounds
- **North**: 33.2°
- **South**: 30.4°
- **East**: 79.0°
- **West**: 75.6°
- **Center**: Shimla (31.1048°, 77.1734°)

### Files Modified

#### `frontend/src/components/map/InteractiveMap.jsx`
- Added `maxBounds` to restrict map panning to HP region
- Set `maxBoundsViscosity={1.0}` for hard boundary enforcement
- Changed default center to Shimla
- Set `minZoom={7}` to prevent zooming out beyond HP
- Updated instruction text to mention "Himachal Pradesh"

#### `frontend/src/pages/PredictionPage.jsx`
- Modified search to query "Himachal Pradesh, India" instead of just "India"
- Added validation to check if searched location is within HP bounds
- Shows alert if user tries to select location outside HP
- Updated placeholder text to "Enter city/town in HP..."

---

## 2. Backend API - New Endpoint for HP Districts

### New Endpoint: `/api/districts/himachal`

**File**: `backend/routes/api_routes.py`

**Features**:
- Fetches real-time data for all 12 HP districts
- Uses GEE to get satellite data for each district center
- Runs ML model prediction for each district
- Returns comprehensive district data

**Districts Covered**:
1. Shimla
2. Mandi
3. Kullu
4. Kangra
5. Chamba
6. Hamirpur
7. Una
8. Bilaspur
9. Solan
10. Sirmaur
11. Kinnaur
12. Lahaul and Spiti

**Response Format**:
```json
{
  "districts": [
    {
      "id": "shimla",
      "name": "Shimla",
      "lat": 31.1048,
      "lon": 77.1734,
      "score": 45.2,
      "level": "MODERATE",
      "confidence": 0.85,
      "elevation": 2205.0,
      "slope": 28.5,
      "rainfall_30d": 125.3,
      "ndvi": 0.45,
      "ndwi": 0.12,
      "soil_type": 3,
      "last_updated": "2026-04-22T10:30:00Z"
    }
  ],
  "count": 12,
  "state": "Himachal Pradesh",
  "timestamp": "2026-04-22T10:30:00Z"
}
```

---

## 3. MapExplorerPage - Complete Redesign

### File: `frontend/src/pages/MapExplorerPage.jsx`

**Complete Rewrite** - Replaced static Maharashtra data with dynamic HP data

### Key Features:

#### 3.1 Leaflet Map Integration
- Interactive Leaflet map showing all HP districts
- Circle markers sized by risk score
- Color-coded by risk level (red/orange/yellow/green)
- Click markers to view district details
- Popups showing quick district info
- Map locked to HP bounds

#### 3.2 Dynamic Data Fetching
- Fetches real-time data from `/api/districts/himachal` on page load
- Shows loading spinner while fetching
- Error handling with retry button
- Auto-selects first district on load
- Refresh button to reload data

#### 3.3 District Details Panel
- Shows selected district information
- **Real GEE Data**:
  - Elevation (meters)
  - Slope angle (degrees)
  - 30-day rainfall (mm)
  - NDVI (vegetation index)
  - NDWI (water content)
  - Soil type
- **ML Model Prediction**:
  - Risk score (0-100)
  - Risk level (LOW/MODERATE/HIGH/CRITICAL)
  - Confidence percentage
- Environmental factor bars showing actual values
- Location coordinates
- "Get Detailed Prediction" button

#### 3.4 Map Controls
- Last updated timestamp
- Staleness indicator
- Risk level legend
- Refresh data button
- Zoom controls

#### 3.5 Animations
- Integrated Framer Motion page transitions
- Smooth fade-in animations
- Loading states

---

## 4. Framer Motion Integration

### Files Modified:

#### `frontend/src/index.css`
- Added CSS keyframe animations as fallback
- Animations: fadeIn, fadeInUp, scaleIn, slideIn (all directions)
- Smooth scroll behavior
- Custom scrollbar styling

#### `frontend/src/pages/PredictionPage.jsx`
- Wrapped page content with `PageTransition`
- Added `FadeInUp` animations to sections
- Smooth transitions between selection/loading/results states

#### `frontend/src/pages/MapExplorerPage.jsx`
- Full page transition wrapper
- Animated district details panel
- Smooth state changes

---

## 5. How It Works

### User Flow:

1. **Map Explorer Page**:
   - User opens Map Explorer
   - Frontend calls `/api/districts/himachal`
   - Backend fetches GEE data for all 12 districts (takes ~30-60 seconds)
   - Map displays districts with color-coded markers
   - User clicks district to see details
   - All data is real-time from GEE + ML model

2. **Prediction Page**:
   - User can only search/select locations in HP
   - Map is locked to HP bounds
   - Search validates location is within HP
   - Clicking outside HP shows error
   - Prediction uses same GEE + ML pipeline

---

## 6. Testing Instructions

### Start Backend:
```bash
cd backend
python app.py
```

### Start Frontend:
```bash
cd frontend
npm run dev
```

### Test Map Explorer:
1. Navigate to Map Explorer page
2. Wait for districts to load (30-60 seconds first time)
3. Click on different district markers
4. Verify data is different for each district
5. Click "Refresh Data" to reload
6. Click "Get Detailed Prediction" to navigate to prediction page

### Test Prediction Page:
1. Try clicking outside HP bounds - should stay within bounds
2. Search for "Shimla" - should work
3. Search for "Delhi" - should show error
4. Click on map within HP - should work
5. Verify prediction uses real GEE data

---

## 7. Performance Notes

- **First Load**: 30-60 seconds (fetching GEE data for 12 districts)
- **Subsequent Loads**: Can implement caching (2-hour cache recommended)
- **Individual Predictions**: 5-10 seconds per location
- **Map Interactions**: Instant (data already loaded)

---

## 8. Future Enhancements

1. **Caching**: Implement Redis/database caching for district data
2. **Background Updates**: Periodic background refresh of district data
3. **Historical Data**: Show trend charts for each district
4. **Weather Forecast**: Integrate weather API for future predictions
5. **Alerts**: Real-time alerts when district risk increases
6. **Export**: PDF reports for districts
7. **Comparison**: Compare multiple districts side-by-side

---

## 9. Error Handling

- GEE API failures: Shows error message with retry button
- Network errors: Graceful fallback with error display
- Invalid locations: Validation prevents out-of-bounds selections
- Missing data: Shows "N/A" for unavailable fields
- Backend errors: Detailed error messages in console

---

## 10. Dependencies

All dependencies already installed:
- `leaflet`: ^1.9.4
- `react-leaflet`: ^4.2.1
- `framer-motion`: ^12.38.0

No additional installation needed!

---

## Files Changed Summary

### Backend:
- `backend/routes/api_routes.py` - Added `/api/districts/himachal` endpoint

### Frontend:
- `frontend/src/components/map/InteractiveMap.jsx` - Added HP bounds lock
- `frontend/src/pages/PredictionPage.jsx` - Added HP search validation + animations
- `frontend/src/pages/MapExplorerPage.jsx` - Complete rewrite with Leaflet + dynamic data
- `frontend/src/index.css` - Added animation keyframes

### Documentation:
- `HIMACHAL_PRADESH_UPDATES.md` - This file

---

## Quick Start

1. Ensure backend is running with GEE authentication
2. Start frontend dev server
3. Navigate to Map Explorer page
4. Wait for initial data load
5. Explore districts!

The entire application is now locked to Himachal Pradesh with real-time dynamic data from GEE and ML predictions. No more static data! 🎉
