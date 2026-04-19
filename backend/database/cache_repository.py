"""
Cache repository for storing recent predictions
Avoids re-fetching GEE data for same locations
"""
from typing import Optional, Dict
from datetime import datetime, timedelta
from database.supabase_client import get_supabase
import math


class PredictionCache:
    """Cache for location-based predictions"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    def _location_key(self, lat: float, lon: float, precision: int = 3) -> str:
        """Create location key (rounded to reduce duplicates)"""
        return f"{round(lat, precision)}_{round(lon, precision)}"
    
    def get_cached(self, lat: float, lon: float, max_age_hours: int = 2) -> Optional[Dict]:
        """
        Get cached prediction for location if recent enough
        
        Args:
            lat: Latitude
            lon: Longitude
            max_age_hours: Maximum age of cached data in hours
        
        Returns:
            Cached prediction or None
        """
        location_key = self._location_key(lat, lon)
        cutoff_time = (datetime.utcnow() - timedelta(hours=max_age_hours)).isoformat()
        
        try:
            result = self.supabase.table('prediction_cache')\
                .select('*')\
                .eq('location_key', location_key)\
                .gte('created_at', cutoff_time)\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            if result.data:
                return result.data[0]
            return None
        except:
            # Table might not exist yet
            return None
    
    def save_prediction(self, lat: float, lon: float, prediction_data: Dict) -> Dict:
        """
        Save prediction to cache
        
        Args:
            lat: Latitude
            lon: Longitude
            prediction_data: Full prediction result
        
        Returns:
            Saved cache entry
        """
        location_key = self._location_key(lat, lon)
        
        cache_entry = {
            'location_key': location_key,
            'lat': lat,
            'lon': lon,
            'prediction_data': prediction_data,
            'created_at': datetime.utcnow().isoformat()
        }
        
        try:
            result = self.supabase.table('prediction_cache')\
                .insert(cache_entry)\
                .execute()
            return result.data[0] if result.data else cache_entry
        except:
            # If table doesn't exist, just return the data
            return cache_entry
    
    def clear_old_cache(self, days: int = 7):
        """Delete cache entries older than specified days"""
        cutoff_time = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        try:
            self.supabase.table('prediction_cache')\
                .delete()\
                .lt('created_at', cutoff_time)\
                .execute()
        except:
            pass
