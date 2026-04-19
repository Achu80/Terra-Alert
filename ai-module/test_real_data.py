import pickle
import pandas as pd

# Load model and scaler
with open('xgboost_model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)

# Load actual data
df = pd.read_csv('landslides_combined.csv')

# Get one actual landslide point
landslide_sample = df[df['label']==1].iloc[0]
non_landslide_sample = df[df['label']==0].iloc[0]

features = ['elevation', 'slope', 'aspect', 'ndvi', 'ndwi', 'soil_type', 
            'rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d']

X_landslide = landslide_sample[features].values.reshape(1, -1)
X_non_landslide = non_landslide_sample[features].values.reshape(1, -1)

# Predict
X_landslide_scaled = scaler.transform(X_landslide)
X_non_landslide_scaled = scaler.transform(X_non_landslide)

pred_landslide = model.predict_proba(X_landslide_scaled)[0][1]
pred_non_landslide = model.predict_proba(X_non_landslide_scaled)[0][1]

print("ACTUAL LANDSLIDE POINT:")
print(landslide_sample[features])
print(f"Model prediction: {pred_landslide:.2%}\n")

print("="*60)

print("\nACTUAL NON-LANDSLIDE POINT:")
print(non_landslide_sample[features])
print(f"Model prediction: {pred_non_landslide:.2%}")