import numpy as np

class DataProcessor:
    """Process GEE data for model input"""
    
    @staticmethod
    def normalize_bands(data):
        """Normalize satellite band values"""
        normalized = {}
        for key, value in data.items():
            if value is not None:
                # Normalize to 0-1 range (Sentinel-2 values are typically 0-10000)
                normalized[key] = value / 10000.0
            else:
                normalized[key] = 0.0
        return normalized
    
    @staticmethod
    def calculate_indices(data):
        """Calculate vegetation and other indices"""
        indices = {}
        
        # NDVI (Normalized Difference Vegetation Index)
        if 'B8' in data and 'B4' in data:
            nir = data['B8']
            red = data['B4']
            if (nir + red) != 0:
                indices['NDVI'] = (nir - red) / (nir + red)
        
        # NDWI (Normalized Difference Water Index)
        if 'B3' in data and 'B8' in data:
            green = data['B3']
            nir = data['B8']
            if (green + nir) != 0:
                indices['NDWI'] = (green - nir) / (green + nir)
        
        return indices
    
    @staticmethod
    def prepare_model_input(gee_data):
        """Prepare data for model inference"""
        if not gee_data:
            return None
        
        normalized = DataProcessor.normalize_bands(gee_data)
        indices = DataProcessor.calculate_indices(gee_data)
        
        # Combine all features
        features = {**normalized, **indices}
        
        # Convert to array format for model
        feature_vector = list(features.values())
        
        return {
            'features': feature_vector,
            'feature_names': list(features.keys()),
            'raw_data': gee_data
        }
