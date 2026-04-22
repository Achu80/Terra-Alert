# Caching Strategy

## Overview
The application uses intelligent caching to balance performance and data freshness.

## Cache Implementation

### 1. **Prediction Page (Individual Locations)** - NO CACHE ✅
- **Endpoint**: `/api/predict`
- **Cache Setting**: `use_cache: false`
- **Behavior**: Always fetches fresh, real-time data from Google Earth Engine
- **Reason**: Users expect live predictions when they select a specific location
- **Response Time**: ~3-5 seconds per prediction

**Frontend Code:**
```javascript
// PredictionPage.jsx
fetch('http://localhost:5000/api/predict', {
    method: 'POST',
    body: JSON.stringify({
        lat: location.lat,
        lon: location.lon,
        use_cache: false  // Always fresh data
    })
})
```

### 2. **Map Explorer Page (District Overview)** - WITH CACHE ✅
- **Endpoint**: `/api/districts/himachal`
- **Cache Setting**: `use_cache: true` (default)
- **Cache Duration**: 30 minutes
- **Behavior**: 
  - First load: Fetches all 12 districts in parallel (~15 seconds)
  - Subsequent loads: Returns cached data instantly
  - Auto-refresh: Every 30 minutes
  - Manual refresh: User can force refresh anytime
- **Reason**: Loading 12 districts takes time; cache improves UX significantly

**Frontend Code:**
```javascript
// MapExplorerPage.jsx
// Default request (uses cache)
fetch('http://localhost:5000/api/districts/himachal')

// Force refresh (bypasses cache)
fetch('http://localhost:5000/api/districts/himachal?force_refresh=true')
```

**Backend Code:**
```python
# api_routes.py
@api_bp.route('/districts/himachal', methods=['GET'])
def get_himachal_districts():
    use_cache = request.args.get('use_cache', 'true').lower() == 'true'
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    
    if use_cache and not force_refresh:
        cached_data = cache.get_all_districts(max_age_minutes=30)
        if cached_data:
            return cached_data
    
    # Fetch fresh data with parallel processing
    # ... (6 workers, ~15 seconds)
```

## Cache Storage

### In-Memory Cache (Current Implementation)
- **Location**: `backend/database/cache_repository.py`
- **Class**: `DistrictCache`
- **Storage**: Class-level dictionary (`_cache`, `_cache_timestamp`)
- **Persistence**: Lost on server restart
- **Advantages**: Fast, simple, no external dependencies

### Future: Database Cache (Optional)
- Can be implemented using Supabase for persistent cache
- Survives server restarts
- Can be shared across multiple backend instances

## Cache Invalidation

### Automatic
- **Time-based**: Cache expires after 30 minutes
- **Auto-refresh**: Frontend refreshes every 30 minutes

### Manual
- **Refresh Button**: User can force refresh in Map Explorer
- **Server Restart**: Clears in-memory cache

## Performance Comparison

| Scenario | Without Cache | With Cache | Improvement |
|----------|--------------|------------|-------------|
| Map Explorer (12 districts) | ~15 seconds | <1 second | **15x faster** |
| Prediction Page (1 location) | ~3-5 seconds | N/A (no cache) | Always fresh |

## Best Practices

### ✅ DO:
- Use cache for bulk operations (district overview)
- Always fetch fresh data for user-initiated predictions
- Show cache age to users
- Provide manual refresh option
- Set reasonable cache expiration (30 minutes)

### ❌ DON'T:
- Cache individual predictions (users expect live data)
- Cache for too long (data becomes stale)
- Hide cache status from users
- Prevent manual refresh

## User Experience

### Prediction Page
```
User clicks location → Loading (3-5s) → Fresh prediction
✅ Always accurate, real-time data
✅ Reflects current conditions
```

### Map Explorer Page
```
First visit → Loading (15s) → All districts loaded → Cached
Next visit → Instant load (<1s) → Shows cache age
After 30 min → Auto-refresh → Fresh data
User clicks refresh → Force refresh → Fresh data
✅ Fast initial experience after first load
✅ Transparent about data freshness
✅ User control over refresh
```

## Configuration

### Frontend
```javascript
// PredictionPage.jsx - Line ~580
use_cache: false  // No cache for individual predictions

// MapExplorerPage.jsx - Line ~89
// Default: uses cache
// Force refresh: adds ?force_refresh=true
```

### Backend
```python
# api_routes.py

# Prediction endpoint - Line ~250
use_cache = data.get('use_cache', True)  # Respects frontend setting

# Districts endpoint - Line ~60
use_cache = request.args.get('use_cache', 'true').lower() == 'true'
max_age_minutes = 30  # Cache expiration
```

### Cache Repository
```python
# database/cache_repository.py
class DistrictCache:
    _cache = {}  # In-memory storage
    _cache_timestamp = None
    
    def get_all_districts(self, max_age_minutes=30):
        # Returns None if cache expired or empty
        
    def save_districts(self, districts_data):
        # Saves with current timestamp
```

## Monitoring

### Cache Hit/Miss Logging
```
✅ Returning cached district data (12 districts)
💾 Saved district data to cache
🚀 Fetching data for 12 districts in parallel...
⏱️  Fetched 12 districts in 14.52 seconds
```

### Frontend Indicators
- Cache age countdown timer
- "Cached" badge on data
- Last updated timestamp
- Refresh button availability

## Summary

| Feature | Prediction Page | Map Explorer |
|---------|----------------|--------------|
| **Cache** | ❌ No | ✅ Yes |
| **Duration** | N/A | 30 minutes |
| **Reason** | Live data needed | Performance |
| **Load Time** | 3-5s | <1s (cached) |
| **Data Freshness** | Always current | Max 30 min old |
| **User Control** | N/A | Manual refresh |

This strategy ensures:
- **Prediction Page**: Always shows live, accurate predictions
- **Map Explorer**: Fast loading with reasonable data freshness
- **User Control**: Transparent caching with manual refresh option
- **Performance**: 15x faster for district overview
