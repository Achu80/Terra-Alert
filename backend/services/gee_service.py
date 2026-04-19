import ee
from datetime import datetime, timedelta
from typing import Dict, Optional


class GEEService:
    def __init__(self, project_id=None):
        """Initialize Google Earth Engine"""
        try:
            if project_id:
                ee.Initialize(project=project_id)
            else:
                ee.Initialize()
            print("✓ GEE initialized successfully")
        except Exception as e:
            print(f"Error initializing GEE: {e}")
            print("Run 'earthengine authenticate' and 'earthengine set_project YOUR_PROJECT_ID'")
    
    def get_all_features(self, lat: float, lon: float, start_date: str, end_date: str, buffer: int = 1000) -> Optional[Dict]:
        """
        Fetch ALL features required for YOUR XGBoost landslide prediction model
        
        Features extracted (in order):
        1. soil_type
        2. ndvi
        3. ndwi
        4. rainfall_3d
        5. rainfall_7d
        6. rainfall_14d
        7. rainfall_30d
        8. elevation
        9. slope
        10. aspect
        
        Args:
            lat: Latitude
            lon: Longitude
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            buffer: Buffer radius in meters (default 1000m)
        
        Returns:
            Dictionary with all features or None if data unavailable
        """
        try:
            point = ee.Geometry.Point([lon, lat])
            region = point.buffer(buffer)
            
            # Initialize features dict
            features = {}
            
            # 1. RAINFALL DATA (CHIRPS) - 3d, 7d, 14d, 30d
            print("Fetching rainfall data...")
            rainfall_features = self._get_rainfall_features(region, start_date, end_date)
            features['rainfall_3d'] = rainfall_features.get('rainfall_3d', 0)
            features['rainfall_7d'] = rainfall_features.get('rainfall_7d', 0)
            features['rainfall_14d'] = rainfall_features.get('rainfall_14d', 0)
            features['rainfall_30d'] = rainfall_features.get('rainfall_30d', 0)
            
            # 2. TERRAIN DATA (SRTM) - elevation, slope, aspect
            print("Fetching terrain data...")
            terrain_features = self._get_terrain_features(region)
            features['elevation'] = terrain_features.get('elevation_mean', 0)
            features['slope'] = terrain_features.get('slope_mean', 0)
            features['aspect'] = terrain_features.get('aspect_mean', 0)
            
            # 3. VEGETATION INDICES (Sentinel-2) - ndvi, ndwi
            print("Fetching vegetation data...")
            vegetation_features = self._get_vegetation_features(region, start_date, end_date)
            features['ndvi'] = vegetation_features.get('ndvi', 0)
            features['ndwi'] = vegetation_features.get('ndwi', 0)
            
            # 4. SOIL DATA (OpenLandMap) - soil_type
            print("Fetching soil data...")
            soil_features = self._get_soil_features(region)
            features['soil_type'] = soil_features.get('soil_type_class', 0)
            
            print(f"✓ Fetched {len(features)} features successfully")
            return features
            
        except Exception as e:
            print(f"Error fetching GEE data: {e}")
            return None
    
    def _get_rainfall_features(self, region, start_date: str, end_date: str) -> Dict:
        """Get rainfall features from CHIRPS dataset"""
        try:
            chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
            
            # Calculate different time windows
            end = datetime.strptime(end_date, '%Y-%m-%d')
            
            # 3-day rainfall
            day_3 = (end - timedelta(days=3)).strftime('%Y-%m-%d')
            rainfall_3d = chirps.filterDate(day_3, end_date).sum()
            
            # 7-day rainfall
            day_7 = (end - timedelta(days=7)).strftime('%Y-%m-%d')
            rainfall_7d = chirps.filterDate(day_7, end_date).sum()
            
            # 14-day rainfall
            day_14 = (end - timedelta(days=14)).strftime('%Y-%m-%d')
            rainfall_14d = chirps.filterDate(day_14, end_date).sum()
            
            # 30-day rainfall
            day_30 = (end - timedelta(days=30)).strftime('%Y-%m-%d')
            rainfall_30d = chirps.filterDate(day_30, end_date).sum()
            
            # Extract values
            values_3d = rainfall_3d.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=5000
            ).getInfo()
            
            values_7d = rainfall_7d.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=5000
            ).getInfo()
            
            values_14d = rainfall_14d.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=5000
            ).getInfo()
            
            values_30d = rainfall_30d.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=5000
            ).getInfo()
            
            return {
                'rainfall_3d': values_3d.get('precipitation', 0),
                'rainfall_7d': values_7d.get('precipitation', 0),
                'rainfall_14d': values_14d.get('precipitation', 0),
                'rainfall_30d': values_30d.get('precipitation', 0)
            }
        except Exception as e:
            print(f"Error fetching rainfall: {e}")
            return {
                'rainfall_3d': 0,
                'rainfall_7d': 0,
                'rainfall_14d': 0,
                'rainfall_30d': 0
            }
    
    def _get_terrain_features(self, region) -> Dict:
        """Get terrain features from SRTM DEM"""
        try:
            # Load SRTM elevation data
            srtm = ee.Image('USGS/SRTMGL1_003')
            elevation = srtm.select('elevation')
            
            # Calculate terrain derivatives
            terrain = ee.Algorithms.Terrain(elevation)
            slope = terrain.select('slope')
            aspect = terrain.select('aspect')
            
            # Calculate curvature (Laplacian)
            curvature = elevation.convolve(ee.Kernel.laplacian8())
            
            # Extract values
            elevation_stats = elevation.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=30
            ).getInfo()
            
            slope_stats = slope.reduceRegion(
                reducer=ee.Reducer.mean().combine(
                    reducer2=ee.Reducer.max(),
                    sharedInputs=True
                ),
                geometry=region,
                scale=30
            ).getInfo()
            
            aspect_stats = aspect.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=30
            ).getInfo()
            
            curvature_stats = curvature.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=30
            ).getInfo()
            
            return {
                'elevation_mean': elevation_stats.get('elevation', 0),
                'slope_mean': slope_stats.get('slope_mean', 0),
                'slope_max': slope_stats.get('slope_max', 0),
                'aspect_mean': aspect_stats.get('aspect', 0),
                'curvature_mean': curvature_stats.get('elevation', 0)
            }
        except Exception as e:
            print(f"Error fetching terrain: {e}")
            return {
                'elevation_mean': 0,
                'slope_mean': 0,
                'slope_max': 0,
                'aspect_mean': 0,
                'curvature_mean': 0
            }
    
    def _get_vegetation_features(self, region, start_date: str, end_date: str) -> Dict:
        """Get vegetation indices from Sentinel-2"""
        try:
            # Sentinel-2 imagery
            s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
                .filterBounds(region) \
                .filterDate(start_date, end_date) \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
            
            if s2.size().getInfo() == 0:
                # Fallback to MODIS if Sentinel-2 unavailable
                return self._get_modis_vegetation(region, start_date, end_date)
            
            # Get median composite
            image = s2.median()
            
            # Calculate NDVI
            nir = image.select('B8')
            red = image.select('B4')
            ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
            
            # Calculate NDWI
            green = image.select('B3')
            ndwi = green.subtract(nir).divide(green.add(nir)).rename('NDWI')
            
            # Extract values
            ndvi_value = ndvi.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=10
            ).getInfo()
            
            ndwi_value = ndwi.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=10
            ).getInfo()
            
            return {
                'ndvi': ndvi_value.get('NDVI', 0),
                'ndwi': ndwi_value.get('NDWI', 0)
            }
        except Exception as e:
            print(f"Error fetching vegetation: {e}")
            return {'ndvi': 0, 'ndwi': 0}
    
    def _get_modis_vegetation(self, region, start_date: str, end_date: str) -> Dict:
        """Fallback: Get NDVI from MODIS"""
        try:
            modis = ee.ImageCollection('MODIS/061/MOD13A2') \
                .filterBounds(region) \
                .filterDate(start_date, end_date) \
                .select('NDVI')
            
            if modis.size().getInfo() == 0:
                return {'ndvi': 0, 'ndwi': 0}
            
            ndvi_image = modis.median()
            ndvi_value = ndvi_image.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=500
            ).getInfo()
            
            # MODIS NDVI is scaled by 10000
            ndvi = ndvi_value.get('NDVI', 0) / 10000.0
            
            return {'ndvi': ndvi, 'ndwi': 0}
        except:
            return {'ndvi': 0, 'ndwi': 0}
    
    def _get_population_features(self, region) -> Dict:
        """Get population density from WorldPop"""
        try:
            # WorldPop population count
            population = ee.ImageCollection('WorldPop/GP/100m/pop') \
                .filterBounds(region) \
                .sort('system:time_start', False) \
                .first()
            
            # Calculate total population and density
            pop_stats = population.reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=region,
                scale=100
            ).getInfo()
            
            total_pop = pop_stats.get('population', 0)
            
            # Calculate area in km²
            area_km2 = region.area().divide(1000000).getInfo()
            
            density = total_pop / area_km2 if area_km2 > 0 else 0
            
            return {
                'population_total': total_pop,
                'population_density': density
            }
        except Exception as e:
            print(f"Error fetching population: {e}")
            return {
                'population_total': 0,
                'population_density': 0
            }
    
    def _get_soil_features(self, region) -> Dict:
        """Get soil texture class from OpenLandMap"""
        try:
            # OpenLandMap soil texture
            soil = ee.Image('OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02') \
                .select('b0')  # 0cm depth
            
            soil_stats = soil.reduceRegion(
                reducer=ee.Reducer.mode(),
                geometry=region,
                scale=250
            ).getInfo()
            
            return {
                'soil_type_class': soil_stats.get('b0', 0)
            }
        except Exception as e:
            print(f"Error fetching soil: {e}")
            return {'soil_type_class': 0}
    
    # Keep backward compatibility
    def get_satellite_data(self, lat, lon, start_date, end_date, buffer=1000):
        """Legacy method - calls get_all_features"""
        return self.get_all_features(lat, lon, start_date, end_date, buffer)
