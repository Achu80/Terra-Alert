"""Test script to verify model loading"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

print("Testing model loading...")
print("=" * 50)

try:
    from services.model_service import ModelService
    
    print("✓ ModelService imported successfully")
    
    model_service = ModelService()
    print("✓ ModelService instantiated")
    
    model_service.load_models()
    print("✓ Models loaded")
    
    print(f"  Model loaded: {model_service.model_loaded}")
    print(f"  Model type: {type(model_service.model)}")
    print(f"  Scaler type: {type(model_service.scaler)}")
    
    if model_service.scaler:
        print(f"  Scaler features: {model_service.scaler.n_features_in_}")
    
    # Test prediction with dummy data
    print("\nTesting prediction with dummy data...")
    dummy_features = [1000.0] * 20  # 20 features
    
    result = model_service.predict(dummy_features)
    print("✓ Prediction successful!")
    print(f"  Score: {result['score']}")
    print(f"  Level: {result['level']}")
    print(f"  Model type: {result['model_type']}")
    
    print("\n" + "=" * 50)
    print("✅ All tests passed!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    print(traceback.format_exc())
    sys.exit(1)
