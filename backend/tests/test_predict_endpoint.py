import requests
import json

# Test the complete prediction pipeline
url = "http://localhost:5000/api/predict"

# Frontend will send just this simple payload
payload = {
    "lat": 40.7128,
    "lon": -74.0060
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
        print(f"\nFeatures extracted: {len(result['features'])}")
        print(f"Feature names: {result['feature_names']}")
        print(f"\nFeature values:")
        for name, value in zip(result['feature_names'], result['features']):
            print(f"  {name}: {value:.4f}")
        print(f"\nPrediction: {result['prediction']}")
    else:
        print(f"✗ Error: {response.status_code}")
        print(response.json())
        
except requests.exceptions.ConnectionError:
    print("✗ Error: Cannot connect to server")
    print("Make sure Flask server is running: python app.py")
except Exception as e:
    print(f"✗ Error: {e}")
