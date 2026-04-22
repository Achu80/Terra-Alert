import os
import numpy as np
from typing import Dict, List, Optional
import joblib
import pickle
import xgboost as xgb


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
            # Load XGBoost model from JSON (version-independent format)
            model_json_path = os.path.join(self.model_dir, 'xgboost_model.json')
            model_pkl_path = os.path.join(self.model_dir, 'xgboost_model.pkl')
            
            # Try JSON format first (preferred)
            if os.path.exists(model_json_path):
                self.model = xgb.XGBClassifier()
                self.model.load_model(model_json_path)
                print("✓ XGBoost model loaded from JSON (version-independent)")
                self.model_loaded = True
            # Fallback to pickle format
            elif os.path.exists(model_pkl_path):
                self.model = joblib.load(model_pkl_path)
                print("✓ XGBoost model loaded from pickle")
                self.model_loaded = True
            else:
                print(f"⚠ Model not found at: {model_json_path} or {model_pkl_path}")
                self.model_loaded = False
                return
            
            # Load StandardScaler parameters from JSON (version-independent)
            scaler_json_path = os.path.join(self.model_dir, 'scaler_params.json')
            scaler_pkl_path = os.path.join(self.model_dir, 'scaler.pkl')
            
            if os.path.exists(scaler_json_path):
                import json
                with open(scaler_json_path, 'r') as f:
                    scaler_params = json.load(f)
                
                # Recreate scaler from parameters
                from sklearn.preprocessing import StandardScaler
                self.scaler = StandardScaler()
                self.scaler.mean_ = np.array(scaler_params['mean'])
                self.scaler.scale_ = np.array(scaler_params['scale'])
                self.scaler.var_ = np.array(scaler_params['var'])
                self.scaler.n_features_in_ = scaler_params['n_features']
                self.scaler.n_samples_seen_ = scaler_params['n_samples_seen']
                print("✓ StandardScaler loaded from JSON (version-independent)")
            elif os.path.exists(scaler_pkl_path):
                self.scaler = joblib.load(scaler_pkl_path)
                print("✓ StandardScaler loaded from pickle")
            else:
                print(f"⚠ Scaler not found at: {scaler_json_path} or {scaler_pkl_path}")
                print("  Model expects scaled features!")
                self.scaler = None
                
        except Exception as e:
            print(f"Error loading model: {e}")
            import traceback
            print(traceback.format_exc())
            self.model_loaded = False
    
    def predict(self, features: List[float]) -> Dict:
        """
    Make landslide prediction using XGBoost model
    
    Args:
        features: List of 20 feature values in correct order
    
    Returns:
        Dictionary with prediction results
    """
    # Load model if not already loaded
        if not self.model_loaded:
          self.load_models()
    
    # If model still not loaded, return mock prediction
        if not self.model or not self.model_loaded:
          print("⚠ Model not loaded, using mock prediction")
          return self._mock_prediction(features)
    
        try:
        # Log input features for debugging
          print(f"\n🔍 DEBUG: Predicting with {len(features)} features")
          print(f"Features: {features[:5]}... (showing first 5)")
        
        # ADD THIS - Extract elevation and slope from features list
        # Assuming: features[0]=elevation, features[1]=slope (VERIFY ORDER!)
          elevation = features[0]  # First feature
          slope = features[1]      # Second feature
        
        # Plains area override
          if elevation < 500 or slope < 10:
            print(f"⛰️ Plains override: elevation={elevation}m, slope={slope}°")
            return {
                'score': 5.0,
                'level': 'low',
                'confidence': 95.0,
                'prediction_class': 0,
                'probabilities': {
                    'no_landslide': 0.95,
                    'landslide': 0.05
                },
                'model_type': 'Rule-Based (Plains)',
                'note': 'Low-risk plains area - outside mountainous prediction zone'
            }
        
        # Reshape features for sklearn
          X = np.array(features).reshape(1, -1)
        
        # Apply StandardScaler (IMPORTANT!)
          if self.scaler:
            X_scaled = self.scaler.transform(X)
            print(f"✓ Features scaled")
          else:
            print("⚠ Warning: No scaler found, using unscaled features")
            X_scaled = X
        
        # Get probability of landslide (class 1)
          proba = self.model.predict_proba(X_scaled)[0]
          landslide_probability = float(proba[1])
        
        # Convert to 0-100 scale
          risk_score = landslide_probability * 100
        
          print(f"✓ Prediction complete: Risk Score = {risk_score:.1f}")
          print(f"  Probabilities: No Landslide={proba[0]:.3f}, Landslide={proba[1]:.3f}")
        
        # Determine risk level
          risk_level = self._get_risk_level(risk_score)
        
        # Get prediction (0 or 1)
          prediction_class = self.model.predict(X_scaled)[0]
        
          return {
            'score': round(risk_score, 1),
            'level': risk_level,
            'confidence': round(max(proba) * 100, 1),
            'prediction_class': int(prediction_class),
            'probabilities': {
                'no_landslide': round(float(proba[0]), 3),
                'landslide': round(float(proba[1]), 3)
            },
            'model_type': 'XGBoost'
        }
        
        except Exception as e:
            print(f"❌ Error making prediction: {e}")
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
