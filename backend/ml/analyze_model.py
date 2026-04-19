"""
Analyze your trained model to determine required features
This script will inspect your model and tell you what GEE data to fetch
"""
import sys
import os
import joblib
import pickle
import numpy as np

def analyze_model(model_path):
    """
    Analyze a trained model to determine its requirements
    
    Args:
        model_path: Path to your .pkl or .pickle model file
    """
    print("=" * 70)
    print("MODEL ANALYSIS")
    print("=" * 70)
    print(f"\nAnalyzing model: {model_path}")
    print("-" * 70)
    
    # Load the model
    try:
        model = joblib.load(model_path)
        print("✓ Model loaded successfully")
    except Exception as e:
        print(f"✗ Error loading model: {e}")
        print("\nTrying with pickle...")
        try:
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
            print("✓ Model loaded with pickle")
        except Exception as e2:
            print(f"✗ Error: {e2}")
            return None
    
    print(f"\nModel Type: {type(model).__name__}")
    print(f"Model Class: {model.__class__.__module__}.{model.__class__.__name__}")
    
    # Check for feature information
    print("\n" + "=" * 70)
    print("FEATURE REQUIREMENTS")
    print("=" * 70)
    
    # 1. Check n_features_in_
    if hasattr(model, 'n_features_in_'):
        print(f"\n✓ Number of features required: {model.n_features_in_}")
    else:
        print("\n⚠ Could not determine number of features")
    
    # 2. Check feature_names_in_
    if hasattr(model, 'feature_names_in_'):
        print(f"\n✓ Feature names found:")
        for i, name in enumerate(model.feature_names_in_, 1):
            print(f"  {i}. {name}")
        
        # Save feature names to file
        feature_file = os.path.join(os.path.dirname(model_path), 'feature_names.txt')
        with open(feature_file, 'w') as f:
            for name in model.feature_names_in_:
                f.write(f"{name}\n")
        print(f"\n✓ Feature names saved to: {feature_file}")
        
        return list(model.feature_names_in_)
    else:
        print("\n⚠ Feature names not found in model")
        print("   Your model was likely trained without feature names")
        
        if hasattr(model, 'n_features_in_'):
            print(f"\n   Model expects {model.n_features_in_} features in this order:")
            print("   You need to provide them in the EXACT order used during training")
            return None
    
    # 3. Check feature importances (if available)
    if hasattr(model, 'feature_importances_'):
        print("\n" + "=" * 70)
        print("FEATURE IMPORTANCES")
        print("=" * 70)
        
        importances = model.feature_importances_
        if hasattr(model, 'feature_names_in_'):
            feature_importance = list(zip(model.feature_names_in_, importances))
            feature_importance.sort(key=lambda x: x[1], reverse=True)
            
            print("\nTop 10 most important features:")
            for i, (name, importance) in enumerate(feature_importance[:10], 1):
                print(f"  {i}. {name}: {importance:.4f}")
    
    # 4. Test prediction
    print("\n" + "=" * 70)
    print("TEST PREDICTION")
    print("=" * 70)
    
    try:
        n_features = model.n_features_in_ if hasattr(model, 'n_features_in_') else 10
        test_input = np.random.rand(1, n_features)
        
        print(f"\nTesting with random input shape: {test_input.shape}")
        
        if hasattr(model, 'predict_proba'):
            prediction = model.predict_proba(test_input)
            print(f"✓ Model has predict_proba: {prediction}")
        elif hasattr(model, 'predict'):
            prediction = model.predict(test_input)
            print(f"✓ Model has predict: {prediction}")
        else:
            print("⚠ Model doesn't have predict or predict_proba methods")
    except Exception as e:
        print(f"✗ Error testing prediction: {e}")
    
    return model

def suggest_gee_mapping(feature_names):
    """
    Suggest GEE data sources for required features
    """
    print("\n" + "=" * 70)
    print("GEE DATA SOURCE SUGGESTIONS")
    print("=" * 70)
    
    # Common feature name patterns and their GEE sources
    gee_mapping = {
        'rainfall': 'UCSB-CHG/CHIRPS/DAILY',
        'rain': 'UCSB-CHG/CHIRPS/DAILY',
        'precipitation': 'UCSB-CHG/CHIRPS/DAILY',
        'elevation': 'USGS/SRTMGL1_003',
        'slope': 'USGS/SRTMGL1_003 (derived)',
        'aspect': 'USGS/SRTMGL1_003 (derived)',
        'curvature': 'USGS/SRTMGL1_003 (derived)',
        'ndvi': 'COPERNICUS/S2_SR_HARMONIZED or MODIS/061/MOD13A2',
        'ndwi': 'COPERNICUS/S2_SR_HARMONIZED',
        'population': 'WorldPop/GP/100m/pop',
        'soil': 'OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02',
        'temperature': 'ECMWF/ERA5_LAND/DAILY_AGGR',
        'humidity': 'ECMWF/ERA5_LAND/DAILY_AGGR',
        'wind': 'ECMWF/ERA5_LAND/DAILY_AGGR'
    }
    
    print("\nBased on your feature names, here are suggested GEE sources:\n")
    
    for feature in feature_names:
        feature_lower = feature.lower()
        found = False
        
        for keyword, source in gee_mapping.items():
            if keyword in feature_lower:
                print(f"✓ {feature}")
                print(f"  → GEE Source: {source}\n")
                found = True
                break
        
        if not found:
            print(f"⚠ {feature}")
            print(f"  → No automatic mapping found")
            print(f"  → You need to manually specify GEE source\n")

def main():
    """Main function"""
    print("\n" + "=" * 70)
    print("MODEL ANALYZER FOR GEE INTEGRATION")
    print("=" * 70)
    
    # Get model path from user
    if len(sys.argv) > 1:
        model_path = sys.argv[1]
    else:
        print("\nUsage: python analyze_model.py <path_to_your_model.pkl>")
        print("\nExample:")
        print("  python analyze_model.py ../your_model_folder/model.pkl")
        print("  python analyze_model.py C:/path/to/your/model.pkl")
        
        model_path = input("\nEnter path to your model file: ").strip()
    
    if not os.path.exists(model_path):
        print(f"\n✗ Error: File not found: {model_path}")
        return
    
    # Analyze the model
    model = analyze_model(model_path)
    
    # Get feature names
    if hasattr(model, 'feature_names_in_'):
        feature_names = list(model.feature_names_in_)
        suggest_gee_mapping(feature_names)
        
        # Generate code template
        print("\n" + "=" * 70)
        print("GENERATED CODE TEMPLATE")
        print("=" * 70)
        
        print("\nAdd this to your GEE service to fetch required features:\n")
        print("```python")
        print("def get_model_features(self, lat, lon, start_date, end_date):")
        print("    features = {}")
        for feature in feature_names:
            print(f"    features['{feature}'] = # TODO: Fetch from GEE")
        print("    return features")
        print("```")
    
    print("\n" + "=" * 70)
    print("NEXT STEPS")
    print("=" * 70)
    print("\n1. Copy your model file to: backend/ml/models/")
    print("2. Update GEE service to fetch required features")
    print("3. Update data processor with correct feature order")
    print("4. Test with: python tests/test_ai_integration.py")
    print("\n")

if __name__ == "__main__":
    main()
