import numpy as np
from typing import Dict, List, Optional


class DataProcessor:
    """Process GEE data for landslide prediction model"""
    
    FEATURE_ORDER = [
        'elevation', 'slope', 'aspect', 'ndvi', 'ndwi', 'soil_type',
        'rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d',
        'rainfall_ratio_3d_7d', 'rainfall_ratio_7d_14d', 'rainfall_ratio_14d_30d',
        'rainfall_acceleration', 'high_short_term_rain', 'sustained_heavy_rain',
        'slope_elevation_product', 'steep_low_elevation', 'north_facing', 'low_veg_steep'
    ]
    
    @staticmethod
    def _engineer_features(gee_data: Dict) -> Dict:
        """Calculate the 10 engineered features from base features"""
        r3 = gee_data.get('rainfall_3d', 0) or 0
        r7 = gee_data.get('rainfall_7d', 0) or 0
        r14 = gee_data.get('rainfall_14d', 0) or 0
        r30 = gee_data.get('rainfall_30d', 0) or 0
        slope = gee_data.get('slope', 0) or 0
        elevation = gee_data.get('elevation', 0) or 0
        aspect = gee_data.get('aspect', 0) or 0
        ndvi = gee_data.get('ndvi', 0) or 0

        engineered = {
            'rainfall_ratio_3d_7d': r3 / r7 if r7 > 0 else 0,
            'rainfall_ratio_7d_14d': r7 / r14 if r14 > 0 else 0,
            'rainfall_ratio_14d_30d': r14 / r30 if r30 > 0 else 0,
            'rainfall_acceleration': (r3 / 3) / (r30 / 30) if r30 > 0 else 0,
            'high_short_term_rain': 1 if r3 > 50 else 0,
            'sustained_heavy_rain': 1 if r7 > 100 else 0,
            'slope_elevation_product': slope * elevation,
            'steep_low_elevation': 1 if (slope > 30 and elevation < 1000) else 0,
            'north_facing': 1 if (aspect >= 315 or aspect <= 45) else 0,
            'low_veg_steep': 1 if (ndvi < 0.3 and slope > 25) else 0,
        }
        return engineered

    @staticmethod
    def prepare_model_input(gee_data: Dict) -> Optional[Dict]:
        if not gee_data:
            return None

        # Merge base + engineered features
        engineered = DataProcessor._engineer_features(gee_data)
        all_data = {**gee_data, **engineered}

        feature_vector = []
        for feature_name in DataProcessor.FEATURE_ORDER:
            value = all_data.get(feature_name, 0)
            if value is None:
                value = 0
            feature_vector.append(float(value))

        derived = DataProcessor.calculate_derived_features(gee_data)

        return {
            'features': feature_vector,
            'feature_names': DataProcessor.FEATURE_ORDER,
            'raw_data': gee_data,
            'derived_features': derived
        }

    @staticmethod
    def calculate_derived_features(gee_data: Dict) -> Dict:
        derived = {}

        rainfall_30d = gee_data.get('rainfall_30d', 0)
        derived['rainfall_intensity'] = rainfall_30d / 30 if rainfall_30d else 0

        rainfall_3d = gee_data.get('rainfall_3d', 0)
        if rainfall_30d > 0:
            derived['rainfall_acceleration'] = (rainfall_3d / 3) / (rainfall_30d / 30)
        else:
            derived['rainfall_acceleration'] = 0

        slope = gee_data.get('slope', 0)
        if slope < 15:
            derived['slope_category'] = 'gentle'
        elif slope < 30:
            derived['slope_category'] = 'moderate'
        elif slope < 45:
            derived['slope_category'] = 'steep'
        else:
            derived['slope_category'] = 'very_steep'

        ndvi = gee_data.get('ndvi', 0)
        if ndvi < 0.2:
            derived['vegetation_health'] = 'bare'
        elif ndvi < 0.4:
            derived['vegetation_health'] = 'sparse'
        elif ndvi < 0.6:
            derived['vegetation_health'] = 'moderate'
        else:
            derived['vegetation_health'] = 'dense'

        ndwi = gee_data.get('ndwi', 0)
        derived['soil_saturation'] = 'high' if ndwi > 0.3 else 'moderate' if ndwi > 0 else 'low'

        return derived

    @staticmethod
    def get_feature_importance_labels() -> Dict[str, str]:
        return {
            'elevation': 'Elevation',
            'slope': 'Slope Angle',
            'aspect': 'Terrain Aspect',
            'ndvi': 'Vegetation Index (NDVI)',
            'ndwi': 'Water/Moisture Index (NDWI)',
            'soil_type': 'Soil Type',
            'rainfall_3d': '3-day Rainfall',
            'rainfall_7d': '7-day Rainfall',
            'rainfall_14d': '14-day Rainfall',
            'rainfall_30d': '30-day Rainfall',
            'rainfall_ratio_3d_7d': 'Rainfall Ratio 3d/7d',
            'rainfall_ratio_7d_14d': 'Rainfall Ratio 7d/14d',
            'rainfall_ratio_14d_30d': 'Rainfall Ratio 14d/30d',
            'rainfall_acceleration': 'Rainfall Acceleration',
            'high_short_term_rain': 'High Short-term Rain Flag',
            'sustained_heavy_rain': 'Sustained Heavy Rain Flag',
            'slope_elevation_product': 'Slope × Elevation',
            'steep_low_elevation': 'Steep Low Elevation Flag',
            'north_facing': 'North Facing Flag',
            'low_veg_steep': 'Low Vegetation + Steep Flag'
        }