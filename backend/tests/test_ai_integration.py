"""
Test AI module integration with GEE backend
Tests the complete flow: GEE → Features → Model → Prediction
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.gee_service import GEEService
from services.model_service import ModelService
from utils.data_processor import DataProcessor
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

def test_complete_pipeline():
    """Test complete AI integration pipeline"""
    
    print("=" * 70)
    print("TESTING AI MODULE INTEGRATION")
    print("=" * 70)
    
    # Test location (example: Mumbai area)
    lat = 30.115
    lon = 78.285
    
    # Date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    print(f"\nTest Location: {lat}, {lon}")
    print(f"Date Range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    print("-" * 70)
    
    # Step 1: Initialize services
    print("\n[1/5] Initializing services...")
    try:
        project_id = os.getenv('GEE_PROJECT_ID')
        gee_service = GEEService(project_id=project_id)
        data_processor = DataProcessor()
        model_service = ModelService()
        print("✓ Services initialized")
    except Exception as e:
        print(f"✗ Error initializing services: {e}")
        return False
    
    # Step 2: Fetch GEE data
    print("\n[2/5] Fetching data from Google Earth Engine...")
    print("This may take 10-15 seconds...")
    try:
        gee_data = gee_service.get_all_features(
            lat, lon,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            buffer=1000
        )
        
        if not gee_data:
            print("✗ No GEE data returned")
            return False
        
        print(f"✓ Fetched {len(gee_data)} features from GEE")
        print("\nSample features:")
        for key, value in list(gee_data.items())[:5]:
            print(f"  {key}: {value}")
    except Exception as e:
        print(f"✗ Error fetching GEE data: {e}")
        return False
    
    # Step 3: Process features
    print("\n[3/5] Processing features for model...")
    try:
        processed = data_processor.prepare_model_input(gee_data)
        
        if not processed:
            print("✗ Failed to process features")
            return False
        
        print(f"✓ Processed {len(processed['features'])} features")
        print(f"\nFeature vector: {processed['features'][:5]}... (showing first 5)")
        print(f"\nDerived features:")
        for key, value in processed['derived_features'].items():
            print(f"  {key}: {value}")
    except Exception as e:
        print(f"✗ Error processing features: {e}")
        return False
    
    # Step 4: Load models
    print("\n[4/5] Loading ML models...")
    try:
        model_service.load_models()
        if model_service.model_loaded:
            print(f"✓ Loaded {len(model_service.models)} models")
        else:
            print("⚠ No models found - will use mock predictions")
    except Exception as e:
        print(f"⚠ Error loading models: {e}")
        print("  Continuing with mock predictions...")
    
    # Step 5: Make prediction
    print("\n[5/5] Making landslide prediction...")
    try:
        prediction = model_service.predict(processed['features'])
        
        print("\n" + "=" * 70)
        print("PREDICTION RESULTS")
        print("=" * 70)
        print(f"\nRisk Score: {prediction['score']}/100")
        print(f"Risk Level: {prediction['level']}")
        print(f"Confidence: {prediction['confidence']*100:.1f}%")
        
        print(f"\nModel Type: {prediction.get('model_type', 'Unknown')}")
        
        if 'probabilities' in prediction:
            print(f"\nProbabilities:")
            print(f"  No Landslide: {prediction['probabilities']['no_landslide']*100:.1f}%")
            print(f"  Landslide: {prediction['probabilities']['landslide']*100:.1f}%")
        
        if 'prediction_class' in prediction:
            print(f"\nPrediction Class: {prediction['prediction_class']} ({'Landslide' if prediction['prediction_class'] == 1 else 'No Landslide'})")
        
        if prediction.get('warning'):
            print(f"\n⚠ {prediction['warning']}")
        
        print("\n" + "=" * 70)
        print("✓ AI INTEGRATION TEST PASSED!")
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"✗ Error making prediction: {e}")
        import traceback
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = test_complete_pipeline()
    sys.exit(0 if success else 1)
