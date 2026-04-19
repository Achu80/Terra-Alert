"""
Inspect XGBoost model to find actual features used
"""
import joblib
import json

# Load model
model = joblib.load('ml/models/xgboost_model.pkl')

print("=" * 70)
print("XGBOOST MODEL INSPECTION")
print("=" * 70)

print(f"\nModel Type: {type(model).__name__}")
print(f"Number of features: {model.n_features_in_}")

# Check for feature names
if hasattr(model, 'feature_names_in_'):
    print("\n✓ Feature names found:")
    for i, name in enumerate(model.feature_names_in_, 1):
        print(f"  {i}. {name}")
elif hasattr(model, 'get_booster'):
    # Try to get from booster
    booster = model.get_booster()
    feature_names = booster.feature_names
    if feature_names:
        print("\n✓ Feature names from booster:")
        for i, name in enumerate(feature_names, 1):
            print(f"  {i}. {name}")
    else:
        print("\n⚠ No feature names in booster")
        print(f"   Model expects {model.n_features_in_} features")
        print("   Default names: f0, f1, f2, ..., f9")

# Get feature importance
print("\n" + "=" * 70)
print("FEATURE IMPORTANCE")
print("=" * 70)

try:
    importance = model.feature_importances_
    print("\nFeature importances:")
    for i, imp in enumerate(importance):
        print(f"  Feature {i}: {imp:.4f}")
    
    # Get feature names if available
    if hasattr(model, 'get_booster'):
        booster = model.get_booster()
        importance_dict = booster.get_score(importance_type='weight')
        print("\nFeature importance (with names if available):")
        for feature, score in sorted(importance_dict.items(), key=lambda x: x[1], reverse=True):
            print(f"  {feature}: {score}")
except Exception as e:
    print(f"Could not get feature importance: {e}")

print("\n" + "=" * 70)
print("NEXT STEPS")
print("=" * 70)
print("\nYou need to find your training script to see:")
print("1. What columns were used as features (X)")
print("2. In what order they were provided")
print("\nLook for code like:")
print("  X = data[['feature1', 'feature2', ...]]")
print("  model.fit(X, y)")
print("\n")
