"""
Save scaler parameters as JSON (version-independent)
"""
import pickle
import json
import numpy as np

# Load the scaler
with open('scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)

# Extract parameters
scaler_params = {
    'mean': scaler.mean_.tolist(),
    'scale': scaler.scale_.tolist(),
    'var': scaler.var_.tolist(),
    'n_features': int(scaler.n_features_in_),
    'n_samples_seen': int(scaler.n_samples_seen_)
}

# Save as JSON
with open('scaler_params.json', 'w') as f:
    json.dump(scaler_params, f, indent=2)

print("✓ Scaler parameters saved to scaler_params.json")
print(f"  Features: {scaler_params['n_features']}")
print(f"  Samples seen: {scaler_params['n_samples_seen']}")
