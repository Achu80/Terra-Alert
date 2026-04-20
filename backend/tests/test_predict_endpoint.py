import requests
import json

# Test the complete prediction pipeline
url = "http://localhost:5000/api/predict"

# Frontend will send just this simple payload
payload = {
    "lat": 30.115,
    "lon": 78.285
}

print("Testing prediction endpoint...")
print(f"Sending: {json.dumps(payload, indent=2)}")
print("-" * 50)

try:
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        result = response.json()
        print("✓ Success!")
        print(f"\nLocation: {result['location']}")
        print(f"Date Range: {result['date_range']}")
        
        # Prediction details
        pred = result['prediction']
        print(f"\n{'='*50}")
        print("PREDICTION RESULTS")
        print('='*50)
        print(f"Risk Score: {pred['score']}/100")
        print(f"Risk Level: {pred['level']}")
        print(f"Confidence: {pred['confidence']*100:.1f}%")
        print(f"Model Type: {pred['model_type']}")
        print(f"\nProbabilities:")
        print(f"  No Landslide: {pred['probabilities']['no_landslide']*100:.1f}%")
        print(f"  Landslide:    {pred['probabilities']['landslide']*100:.1f}%")
        
        # Features
        print(f"\n{'='*50}")
        print("FEATURES EXTRACTED")
        print('='*50)
        features = result['features']
        for name, value in zip(features['names'], features['values']):
            print(f"  {name:20s}: {value:8.4f}")
        
        # Derived features
        if 'derived_features' in result:
            print(f"\nDerived Features:")
            for key, value in result['derived_features'].items():
                if isinstance(value, (int, float)):
                    print(f"  {key:20s}: {value:8.4f}")
                else:
                    print(f"  {key:20s}: {value}")
        
        print(f"\n{'='*50}")
        print(f"Timestamp: {result['timestamp']}")
        print(f"Cached: {result['cached']}")
        
        if 'warning' in pred:
            print(f"\n⚠ Warning: {pred['warning']}")
        
    else:
        print(f"✗ Error: {response.status_code}")
        print(response.json())
        
except requests.exceptions.ConnectionError:
    print("✗ Error: Cannot connect to server")
    print("Make sure Flask server is running: python app.py")
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    print(traceback.format_exc())
