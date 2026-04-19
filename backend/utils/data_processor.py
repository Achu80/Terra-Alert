import numpy as np
from typing import Dict, List, Optional


class DataProcessor:
    """Process GEE data for landslide prediction model"""
    
    # Feature order MUST match your training script
    FEATURE_ORDER = [
        'soil_type',
        'ndvi',
        'ndwi',
        'rainfall_3d',
        'rainfall_7d',
        'rainfall_14d',
        'rainfall_30d',
        'elevation',
        'slope',
        'aspect'
    ]
    
    @staticmethod
    def prepare_model_input(gee_data: Dict) -> Optional[Dict]:
        """
        Prepare GEE data for XGBoost model inference
        
        Args:
            gee_data: Raw data from GEE service
        
        Returns:
            Dictionary with:
            - features: List of feature values in correct order
            - feature_names: List of feature names
            - raw_data: Original GEE data
        """
        if not gee_data:
            return None
        
        # Extract features in EXACT order used during training
        feature_vector = []
        for feature_name in DataProcessor.FEATURE_ORDER:
            value = gee_data.get(feature_name, 0)
            # Handle None values
            if value is None:
                if feature_name == 'soil_type':
                    value = 0  # Mode from training
                elif feature_name in ['ndvi', 'ndwi', 'elevation', 'slope', 'aspect']:
                    value = 0  # Median from training
                else:  # rainfall features
                    value = 0
            feature_vector.append(float(value))
        
        # Calculate additional derived features for display
        derived = DataProcessor.calculate_derived_features(gee_data)
        
        return {
            'features': feature_vector,
            'feature_names': DataProcessor.FEATURE_ORDER,
            'raw_data': gee_data,
            'derived_features': derived
        }
    
    @staticmethod
    def calculate_derived_features(gee_data: Dict) -> Dict:
        """
        Calculate additional derived features for interpretation
        """
        derived = {}
        
        # Rainfall intensity
        rainfall_30d = gee_data.get('rainfall_30d', 0)
        derived['rainfall_intensity'] = rainfall_30d / 30 if rainfall_30d else 0
        
        # Rainfall acceleration (recent vs long-term)
        rainfall_3d = gee_data.get('rainfall_3d', 0)
        if rainfall_30d > 0:
            derived['rainfall_acceleration'] = (rainfall_3d / 3) / (rainfall_30d / 30)
        else:
            derived['rainfall_acceleration'] = 0
        
        # Slope category
        slope = gee_data.get('slope', 0)
        if slope < 15:
            derived['slope_category'] = 'gentle'
        elif slope < 30:
            derived['slope_category'] = 'moderate'
        elif slope < 45:
            derived['slope_category'] = 'steep'
        else:
            derived['slope_category'] = 'very_steep'
        
        # Vegetation health
        ndvi = gee_data.get('ndvi', 0)
        if ndvi < 0.2:
            derived['vegetation_health'] = 'bare'
        elif ndvi < 0.4:
            derived['vegetation_health'] = 'sparse'
        elif ndvi < 0.6:
            derived['vegetation_health'] = 'moderate'
        else:
            derived['vegetation_health'] = 'dense'
        
        # Soil saturation indicator
        ndwi = gee_data.get('ndwi', 0)
        derived['soil_saturation'] = 'high' if ndwi > 0.3 else 'moderate' if ndwi > 0 else 'low'
        
        return derived
    
    @staticmethod
    def get_feature_importance_labels() -> Dict[str, str]:
        """
        Get human-readable labels for features
        """
        return {
            'soil_type': 'Soil Type',
            'ndvi': 'Vegetation Index (NDVI)',
            'ndwi': 'Water/Moisture Index (NDWI)',
            'rainfall_3d': '3-day Rainfall',
            'rainfall_7d': '7-day Rainfall',
            'rainfall_14d': '14-day Rainfall',
            'rainfall_30d': '30-day Rainfall',
            'elevation': 'Elevation',
            'slope': 'Slope Angle',
            'aspect': 'Terrain Aspect'
        }

