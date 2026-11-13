import ee
import json
import os
import time
import requests
from datetime import datetime, timedelta
from typing import Dict, Optional

# Rain recipes. Each model is trained on one of these and must be fed the same one live:
#   'chirps' - CHIRPS daily (v2). Accurate monthly totals but published ~3 weeks late.
#   'imerg'  - NASA GPM IMERG half-hourly (v3). About 1 day late. Falls back to Open-Meteo if stale.
# V07 first: it is what v3/v4 were trained on. V08 (not in Earth Engine yet as of 2026-11) is only a backup
# until ai-module/v3/compare_rain_sources_v3.py shows it matches V07 - otherwise the model would silently get
# rain on a scale it never learned the day NASA publishes V08.
IMERG_COLLECTIONS = ['NASA/GPM_L3/IMERG_V07', 'NASA/GPM_L3/IMERG_V08']
IMERG_MAX_AGE_DAYS = 3

# One line per live feature fetch: which rain source was really used (see _log_rain_source)
RAIN_SOURCE_LOG = os.path.join(os.path.dirname(__file__), '..', 'logs', 'rain_source_log.jsonl')
RAIN_WINDOWS = (3, 7, 14, 30)
_LATEST_CACHE_SECONDS = 3600


class GEEService:
    # (collection name -> (checked_at, latest_image_datetime)) shared by all instances
    _latest_cache = {}
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
    
    def get_all_features(self, lat: float, lon: float, start_date: str, end_date: str, buffer: int = 1000,
                         rain_source: str = 'chirps', veg_source: str = 'sentinel2') -> Optional[Dict]:
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
            
            # 1. RAINFALL DATA - 3d, 7d, 14d, 30d, from the rain source the active model was trained on
            print(f"Fetching rainfall data ({rain_source})...")
            if rain_source == 'imerg':
                rainfall_features = self._get_rainfall_imerg(region, lat, lon, end_date)
            else:
                rainfall_features = self._get_rainfall_features(region, start_date, end_date)
                rainfall_features['rain_source_used'] = 'chirps'
                rainfall_features['rain_data_age_days'] = self._data_age_days('UCSB-CHG/CHIRPS/DAILY', end_date)
            features['rainfall_3d'] = rainfall_features.get('rainfall_3d', 0)
            features['rainfall_7d'] = rainfall_features.get('rainfall_7d', 0)
            features['rainfall_14d'] = rainfall_features.get('rainfall_14d', 0)
            features['rainfall_30d'] = rainfall_features.get('rainfall_30d', 0)
            # Metadata (not model inputs): which rain source was used and how old its newest data is
            features['rain_source_used'] = rainfall_features.get('rain_source_used')
            features['rain_data_age_days'] = rainfall_features.get('rain_data_age_days')
            self._log_rain_source(lat, lon, end_date, rain_source, features)

            # No rain data is NOT the same as no rain: 0 mm would make every place look safe. Callers treat
            # None as "data unavailable" (district shows UNKNOWN, /predict returns an error) instead.
            if features['rain_source_used'] == 'unavailable':
                print("❌ No rain source available - refusing to predict with 0 mm rain")
                return None

            # 2. TERRAIN DATA (SRTM) - elevation, slope, aspect
            print("Fetching terrain data...")
            terrain_features = self._get_terrain_features(region)
            if terrain_features is None:
                # Same idea: elevation 0 / slope 0 would trigger the plains rule and show LOW risk
                return None
            features['elevation'] = terrain_features.get('elevation_mean', 0)
            features['slope'] = terrain_features.get('slope_mean', 0)
            features['aspect'] = terrain_features.get('aspect_mean', 0)
            
            # 3. VEGETATION INDICES (Sentinel-2) - ndvi, ndwi
            print(f"Fetching vegetation data ({veg_source})...")
            if veg_source == 'modis_sr':
                vegetation_features = self._get_vegetation_modis_sr(region, start_date, end_date)
            else:
                vegetation_features = self._get_vegetation_features(region, start_date, end_date)
            features['ndvi'] = vegetation_features.get('ndvi', 0)
            features['ndwi'] = vegetation_features.get('ndwi', 0)
            
            # 4. SOIL DATA (OpenLandMap) - soil_type
            print("Fetching soil data...")
            soil_features = self._get_soil_features(region)
            features['soil_type'] = soil_features.get('soil_type_class', 0)

            print(f"✓ Fetched {len(features)} features successfully")
            print(f"🔍 DEBUG - GEE Features:")
            for key, value in features.items():
                print(f"  {key}: {value}")
            
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
    
    # ------------------------------------------------------------------
    @staticmethod
    def _log_rain_source(lat, lon, end_date, requested, features):
        """Append which rain source a live fetch really used, so we can count fallbacks later
        (summary: py -3.11 ai-module/v3/compare_rain_sources_v3.py --log-only). Never breaks a prediction."""
        try:
            os.makedirs(os.path.dirname(RAIN_SOURCE_LOG), exist_ok=True)
            entry = {
                'time': datetime.utcnow().isoformat(timespec='seconds'),
                'lat': round(lat, 4), 'lon': round(lon, 4), 'end_date': end_date,
                'requested': requested,
                'used': features.get('rain_source_used'),
                'age_days': features.get('rain_data_age_days'),
                **{f'rainfall_{d}d': round(float(features.get(f'rainfall_{d}d') or 0), 2) for d in RAIN_WINDOWS},
            }
            with open(RAIN_SOURCE_LOG, 'a', encoding='utf-8') as f:
                f.write(json.dumps(entry) + '\n')
        except Exception as e:
            print(f"⚠ Could not write rain source log: {e}")

    # IMERG rain (v3) + freshness helpers
    # ------------------------------------------------------------------
    def _latest_image_time(self, collection_name: str) -> Optional[datetime]:
        """Newest image time in a collection (cached for an hour); None if the collection is unavailable."""
        cached = GEEService._latest_cache.get(collection_name)
        if cached and time.time() - cached[0] < _LATEST_CACHE_SECONDS:
            return cached[1]
        try:
            ms = ee.ImageCollection(collection_name).limit(1, 'system:time_start', False) \
                .first().get('system:time_start').getInfo()
            latest = datetime.utcfromtimestamp(ms / 1000) if ms else None
        except Exception:
            latest = None
        GEEService._latest_cache[collection_name] = (time.time(), latest)
        return latest

    def _data_age_days(self, collection_name: str, end_date: str) -> Optional[int]:
        """How many days the newest data is behind the end of the requested window."""
        latest = self._latest_image_time(collection_name)
        if latest is None:
            return None
        end = datetime.strptime(end_date, '%Y-%m-%d')
        return max(0, (end - latest).days)

    @staticmethod
    def imerg_totals(collection_name: str, region, end_date: str) -> Dict:
        """Rain totals (mm) from one IMERG collection for the 3/7/14/30 days before end_date (no fallback).
        IMERG is half-hourly in mm/hr, so each image contributes mm/hr x 0.5 h."""
        end = datetime.strptime(end_date, '%Y-%m-%d')
        col = ee.ImageCollection(collection_name).select('precipitation')
        bands = [
            col.filterDate((end - timedelta(days=d)).strftime('%Y-%m-%d'), end_date)
               .sum().multiply(0.5).rename(f'rainfall_{d}d')
            for d in RAIN_WINDOWS
        ]
        values = ee.Image.cat(bands).reduceRegion(
            reducer=ee.Reducer.mean(), geometry=region, scale=10000
        ).getInfo()
        return {f'rainfall_{d}d': float(values.get(f'rainfall_{d}d') or 0) for d in RAIN_WINDOWS}

    def _get_rainfall_imerg(self, region, lat: float, lon: float, end_date: str) -> Dict:
        """Rain totals (mm) for the 3/7/14/30 days before end_date from NASA GPM IMERG.
        IMERG is half-hourly in mm/hr, so each image contributes mm/hr x 0.5 h.
        Falls back to Open-Meteo when IMERG is missing or more than IMERG_MAX_AGE_DAYS behind."""
        for name in IMERG_COLLECTIONS:
            age = self._data_age_days(name, end_date)
            if age is None:
                continue
            if age > IMERG_MAX_AGE_DAYS:
                print(f"⚠ {name} is {age} days behind - trying the next rain source")
                continue
            try:
                result = self.imerg_totals(name, region, end_date)
                result['rain_source_used'] = 'imerg_' + name.rsplit('_', 1)[-1].lower()
                result['rain_data_age_days'] = age
                return result
            except Exception as e:
                print(f"Error fetching IMERG rain from {name}: {e}")
        return self._get_rainfall_open_meteo(lat, lon, end_date)

    def _get_rainfall_open_meteo(self, lat: float, lon: float, end_date: str) -> Dict:
        """Backup rain source: Open-Meteo daily precipitation (free, no key). Windows end before end_date."""
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d')
            start = end - timedelta(days=max(RAIN_WINDOWS))
            recent = (datetime.utcnow() - end).days < 80
            url = 'https://api.open-meteo.com/v1/forecast' if recent else 'https://archive-api.open-meteo.com/v1/archive'
            params = {
                'latitude': lat, 'longitude': lon, 'daily': 'precipitation_sum', 'timezone': 'UTC',
                'start_date': start.strftime('%Y-%m-%d'), 'end_date': (end - timedelta(days=1)).strftime('%Y-%m-%d'),
            }
            daily = requests.get(url, params=params, timeout=15).json()['daily']
            by_day = dict(zip(daily['time'], daily['precipitation_sum']))
            result = {}
            for d in RAIN_WINDOWS:
                days = [(end - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, d + 1)]
                result[f'rainfall_{d}d'] = float(sum(by_day.get(day) or 0 for day in days))
            result['rain_source_used'] = 'open-meteo'
            result['rain_data_age_days'] = 0
            return result
        except Exception as e:
            print(f"Error fetching Open-Meteo rain: {e}")
            result = {f'rainfall_{d}d': 0 for d in RAIN_WINDOWS}
            result['rain_source_used'] = 'unavailable'
            result['rain_data_age_days'] = None
            return result

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
            return None  # caller stops: zeros here would look like flat sea-level land (LOW risk)
    
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
    
    def _get_vegetation_modis_sr(self, region, start_date: str, end_date: str) -> Dict:
        """NDVI and NDWI from MODIS 8-day surface reflectance (MOD09A1, 500 m), available 2000-today.
        Used by models trained on historical events (before Sentinel-2 existed), so training and live
        vegetation come from the same sensor. NDVI = (NIR-red)/(NIR+red), NDWI = (green-NIR)/(green+NIR)."""
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d')
            for days_back in (30, 60):  # composites arrive ~2 weeks late, so widen the window if needed
                start = (end - timedelta(days=days_back)).strftime('%Y-%m-%d')
                col = ee.ImageCollection('MODIS/061/MOD09A1').filterBounds(region).filterDate(start, end_date)
                if col.size().getInfo() == 0:
                    continue
                image = col.median()
                values = image.normalizedDifference(['sur_refl_b02', 'sur_refl_b01']).rename('ndvi') \
                    .addBands(image.normalizedDifference(['sur_refl_b04', 'sur_refl_b02']).rename('ndwi')) \
                    .reduceRegion(reducer=ee.Reducer.mean(), geometry=region, scale=500).getInfo()
                return {'ndvi': values.get('ndvi') or 0, 'ndwi': values.get('ndwi') or 0}
            return {'ndvi': 0, 'ndwi': 0}
        except Exception as e:
            print(f"Error fetching MODIS vegetation: {e}")
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
