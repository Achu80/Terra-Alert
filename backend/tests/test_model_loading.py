"""
Test if XGBoost model is loading correctly
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.model_service import ModelService
import numpy as np

print("="*60)
print("MODEL LOADING TEST")
print("="*60)

# Initialize model service
model_service = ModelService()

# Check model directory
print(f"\nModel directory: {model_service.model_dir}")
print(f"Model loaded: {model_service.model_loaded}")

# Try to load models
print("\nAttempting to load models...")
model_service.load_models()

print(f"\nAfter loading:")
print(f"  Model loaded: {model_service.model_loaded}")
print(f"  Model type: {type(model_service.model)}")
print(f"  Scaler type: {type(model_service.scaler)}")

# Test prediction with sample data
print("\n" + "="*60)
print("TESTING PREDICTIONS")
print("="*60)

# Test 1: All zeros
test_features_1 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
print("\nTest 1: All zeros")
print(f"Features: {test_features_1}")
result_1 = model_service.predict(test_features_1)
print(f"Result: {result_1}")

# Test 2: High risk scenario (high rainfall, steep slope)
test_features_2 = [5, 0.3, 0.2, 50, 100, 150, 200, 1000, 35, 180]
print("\nTest 2: High risk (high rainfall, steep slope)")
print(f"Features: {test_features_2}")
result_2 = model_service.predict(test_features_2)
print(f"Result: {result_2}")

# Test 3: Low risk scenario (low rainfall, gentle slope)
test_features_3 = [2, 0.7, 0.1, 5, 10, 15, 20, 500, 5, 90]
print("\nTest 3: Low risk (low rainfall, gentle slope)")
print(f"Features: {test_features_3}")
result_3 = model_service.predict(test_features_3)
print(f"Result: {result_3}")

print("\n" + "="*60)
print("ANALYSIS")
print("="*60)

if result_1['model_type'] == 'Mock':
    print("⚠️  WARNING: Using MOCK predictions!")
    print("   XGBoost model is NOT loaded properly")
    print("   Check if xgboost is installed: pip install xgboost")
else:
    print("✓ XGBoost model is working!")
    
    # Check if predictions are varying
    scores = [result_1['score'], result_2['score'], result_3['score']]
    if len(set(scores)) == 1:
        print("⚠️  WARNING: All predictions are the same!")
        print("   This suggests the model might not be working correctly")
    else:
        print(f"✓ Predictions are varying: {scores}")
        print("   Model is responding to different inputs")
