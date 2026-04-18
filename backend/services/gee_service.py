import ee
from datetime import datetime, timedelta

class GEEService:
    def __init__(self, project_id=None):
        """Initialize Google Earth Engine"""
        try:
            if project_id:
                ee.Initialize(project=project_id)
            else:
                ee.Initialize()
        except Exception as e:
            print(f"Error initializing GEE: {e}")
            print("Run 'earthengine authenticate' and 'earthengine set_project YOUR_PROJECT_ID'")
    
    def get_satellite_data(self, lat, lon, start_date, end_date, buffer=1000):
        """
        Fetch satellite data for a specific location and time range
        
        Args:
            lat: Latitude
            lon: Longitude
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            buffer: Buffer radius in meters (default 1000m)
        """
        point = ee.Geometry.Point([lon, lat])
        region = point.buffer(buffer)
        
        # Sentinel-2 imagery
        s2_collection = (ee.ImageCollection('COPERNICUS/S2_SR')
                        .filterBounds(region)
                        .filterDate(start_date, end_date)
                        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))
        
        if s2_collection.size().getInfo() == 0:
            return None
        
        # Get median composite
        image = s2_collection.median()
        
        # Extract band values
        bands = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12']
        values = image.select(bands).reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=10
        ).getInfo()
        
        return values
