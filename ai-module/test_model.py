import pickle
import numpy as np

# Load model and scaler
with open('xgboost_model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)

# Feature order: elevation, slope, aspect, ndvi, ndwi, soil_type, 
#                rainfall_3d, rainfall_7d, rainfall_14d, rainfall_30d

# Test case 1: HIGH RISK (mid-elevation + moderate slope + HEAVY rain)
test_high_risk = np.array([[1500, 25, 180, 0.4, 0.1, 5, 80, 150, 250, 400]])

# Test case 2: LOW RISK (very high elevation/low elevation + gentle slope + no rain)
test_low_risk = np.array([[5000, 5, 90, 0.3, 0.05, 3, 2, 5, 10, 30]])

# Predict
test_high_scaled = scaler.transform(test_high_risk)
test_low_scaled = scaler.transform(test_low_risk)

high_pred = model.predict_proba(test_high_scaled)[0][1]
low_pred = model.predict_proba(test_low_scaled)[0][1]

print("="*60)
print("MODEL PREDICTION TEST")
print("="*60)
print(f"\nHIGH-RISK scenario (mid-elevation, moderate slope, heavy rain):")
print(f"  → Landslide probability: {high_pred:.2%}")
print(f"\nLOW-RISK scenario (extreme elevation, gentle slope, low rain):")
print(f"  → Landslide probability: {low_pred:.2%}")
print("\n" + "="*60)

if high_pred > 0.6 and low_pred < 0.4:
    print("✅ MODEL WORKING CORRECTLY - Ready for backend integration!")
else:
    print("⚠️  Check predictions - may need tuning")