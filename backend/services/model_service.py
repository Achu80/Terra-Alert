import os
import numpy as np
from typing import Dict, List, Optional
import joblib
import pickle


class ModelService:
    """Service for landslide prediction using XGBoost model"""
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.model_loaded = False
        self.model_dir = os.path.join(os.path.dirname(__file__), '..', 'ml', 'models')
    
    def load_models(self):
        """Load trained XGBoost model and scaler from disk"""
        try:
            # Load XGBoost model
            model_path = os.path.join(self.model_dir, 'xgboost_model.pkl')
            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
                print("✓ XGBoost model loaded")
                self.model_loaded = True
            else:
                print(f"⚠ Model not found at: {model_path}")
                self.model_loaded = False
                return
            
            # Load StandardScaler
            scaler_path = os.path.join(self.model_dir, 'scaler.pkl')
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
                print("✓ StandardScaler loaded")
            else:
                print(f"⚠ Scaler not found at: {scaler_path}")
                print("  Model expects scaled features!")
                self.scaler = None
                
        except Exception as e:
            print(f"Error loading model: {e}")
            self.model_loaded = False
    
    def predict(self, features: List[float]) -> Dict:
        """
        Make landslide prediction using XGBoost model
        
        Args:
            features: List of 10 feature values in correct order:
                     [soil_type, ndvi, ndwi, rainfall_3d, rainfall_7d, 
                      rainfall_14d, rainfall_30d, elevation, slope, aspect]
        
        Returns:
            Dictionary with prediction results
        """
        # Load model if not already loaded
        if not self.model_loaded:
            self.load_models()
        
        # If model still not loaded, return mock prediction
        if not self.model or not self.model_loaded:
            return self._mock_prediction(features)
        
        try:
            # Reshape features for sklearn
            X = np.array(features).reshape(1, -1)
            
            # Apply StandardScaler (IMPORTANT!)
            if self.scaler:
                X_scaled = self.scaler.transform(X)
            else:
                print("⚠ Warning: No scaler found, using unscaled features")
                X_scaled = X
            
            # Get probability of landslide (class 1)
            proba = self.model.predict_proba(X_scaled)[0]
            landslide_probability = float(proba[1])
            
            # Convert to 0-100 scale
            risk_score = landslide_probability * 100
            
            # Determine risk level
            risk_level = self._get_risk_level(risk_score)
            
            # Get prediction (0 or 1)
            prediction_class = self.model.predict(X_scaled)[0]
            
            return {
                'score': round(risk_score, 1),
                'level': risk_level,
                'confidence': round(max(proba), 2),  # Confidence is max probability
                'prediction_class': int(prediction_class),
                'probabilities': {
                    'no_landslide': round(float(proba[0]), 3),
                    'landslide': round(float(proba[1]), 3)
                },
                'model_type': 'XGBoost'
            }
            
        except Exception as e:
            print(f"Error making prediction: {e}")
            import traceback
            print(traceback.format_exc())
            return self._mock_prediction(features)
    
    def _mock_prediction(self, features: List[float]) -> Dict:
        """
        Generate mock prediction when model is not available
        Based on feature values (rainfall, slope, etc.)
        """
        # Simple heuristic based on key features
        # features order: soil_type, ndvi, ndwi, rainfall_3d, rainfall_7d, rainfall_14d, rainfall_30d, elevation, slope, aspect
        
        rainfall_score = min(100, (features[3] + features[4] + features[5]) / 3)  # rainfall
        slope_score = min(100, features[8] * 2)  # slope
        ndvi_score = max(0, (1 - features[1]) * 50)  # low vegetation = higher risk
        
        # Weighted combination
        risk_score = (rainfall_score * 0.5 + slope_score * 0.3 + ndvi_score * 0.2)
        risk_score = max(0, min(100, risk_score))
        
        risk_level = self._get_risk_level(risk_score)
        
        return {
            'score': round(risk_score, 1),
            'level': risk_level,
            'confidence': 0.75,
            'prediction_class': 1 if risk_score >= 50 else 0,
            'probabilities': {
                'no_landslide': round((100 - risk_score) / 100, 3),
                'landslide': round(risk_score / 100, 3)
            },
            'model_type': 'Mock',
            'warning': 'Using mock prediction - XGBoost model not loaded'
        }
    
    def _get_risk_level(self, score: float) -> str:
        """Convert risk score to categorical level"""
        if score >= 80:
            return 'CRITICAL'
        elif score >= 60:
            return 'HIGH'
        elif score >= 40:
            return 'MODERATE'
        else:
            return 'LOW'
    
    def get_feature_importance(self) -> Optional[Dict]:
        """
        Get feature importance from XGBoost model
        """
        if not self.model or not self.model_loaded:
            return None
        
        try:
            if hasattr(self.model, 'feature_importances_'):
                from utils.data_processor import DataProcessor
                
                importances = self.model.feature_importances_
                feature_names = DataProcessor.FEATURE_ORDER
                
                # Create dict of feature: importance
                importance_dict = {
                    name: float(imp) 
                    for name, imp in zip(feature_names, importances)
                }
                
                # Sort by importance
                sorted_importance = dict(
                    sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
                )
                
                return sorted_importance
        except Exception as e:
            print(f"Error getting feature importance: {e}")
            return None
