"""
Simple in-memory cache for district data and predictions
This avoids hitting GEE API repeatedly for the same data
"""

from datetime import datetime, timedelta
import json

class DistrictCache:
    """In-memory cache for district data"""
    
    # Class-level variables (shared across all instances)
    _cache = {}
    _cache_timestamp = None
    
    def save_districts(self, districts_data):
        """Save all districts data to cache"""
        DistrictCache._cache['districts'] = districts_data
        DistrictCache._cache_timestamp = datetime.utcnow()
        print(f"💾 Cached {len(districts_data)} districts at {DistrictCache._cache_timestamp}")
        print(f"💾 Cache now contains: {list(DistrictCache._cache.keys())}")
    
    def get_all_districts(self, max_age_minutes=30):
        """Get all districts from cache if not expired (default: 30 minutes)"""
        print(f"🔍 Checking cache... Timestamp: {DistrictCache._cache_timestamp}, Keys: {list(DistrictCache._cache.keys())}")
        
        if not DistrictCache._cache_timestamp:
            print("❌ Cache miss: No timestamp found")
            return None
        
        age = datetime.utcnow() - DistrictCache._cache_timestamp
        if age > timedelta(minutes=max_age_minutes):
            print(f"⏰ Cache expired (age: {age.total_seconds()/60:.1f} minutes, max: {max_age_minutes} minutes)")
            return None
        
        districts = DistrictCache._cache.get('districts')
        if districts:
            print(f"✅ Cache hit! Returning {len(districts)} districts (age: {age.total_seconds()/60:.1f} minutes)")
        else:
            print("❌ Cache miss: No districts in cache")
        return districts
    
    def get_cache_age_minutes(self):
        """Get cache age in minutes"""
        if not DistrictCache._cache_timestamp:
            return None
        age = datetime.utcnow() - DistrictCache._cache_timestamp
        return round(age.total_seconds() / 60, 1)
    
    def clear(self):
        """Clear the cache"""
        DistrictCache._cache = {}
        DistrictCache._cache_timestamp = None
        print("🗑️  Cache cleared")


class PredictionCache:
    """In-memory cache for individual predictions"""
    
    # Class-level variable (shared across all instances)
    _predictions = {}
    
    def _get_key(self, lat, lon):
        """Generate cache key from coordinates (rounded to 4 decimals)"""
        return f"{round(lat, 4)}_{round(lon, 4)}"
    
    def save_prediction(self, lat, lon, prediction_data):
        """Save a prediction to cache"""
        key = self._get_key(lat, lon)
        PredictionCache._predictions[key] = {
            'prediction_data': prediction_data,
            'created_at': datetime.utcnow().isoformat()
        }
        print(f"💾 Cached prediction for {lat:.4f}, {lon:.4f}")
    
    def get_cached(self, lat, lon, max_age_hours=2):
        """Get cached prediction if available and not expired"""
        key = self._get_key(lat, lon)
        cached = PredictionCache._predictions.get(key)
        
        if not cached:
            return None
        
        created_at = datetime.fromisoformat(cached['created_at'])
        age = datetime.utcnow() - created_at
        
        if age > timedelta(hours=max_age_hours):
            # Expired, remove from cache
            del PredictionCache._predictions[key]
            return None
        
        print(f"✅ Cache hit for {lat:.4f}, {lon:.4f} (age: {age.total_seconds()/60:.1f} minutes)")
        return cached
    
    def clear(self):
        """Clear all cached predictions"""
        PredictionCache._predictions = {}
        print("🗑️  Prediction cache cleared")
    
    def cleanup_expired(self, max_age_hours=2):
        """Remove expired predictions from cache"""
        now = datetime.utcnow()
        expired_keys = []
        
        for key, cached in PredictionCache._predictions.items():
            created_at = datetime.fromisoformat(cached['created_at'])
            age = now - created_at
            if age > timedelta(hours=max_age_hours):
                expired_keys.append(key)
        
        for key in expired_keys:
            del PredictionCache._predictions[key]
        
        if expired_keys:
            print(f"🗑️  Cleaned up {len(expired_keys)} expired predictions")
