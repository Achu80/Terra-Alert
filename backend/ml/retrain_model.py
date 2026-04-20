"""
Retrain XGBoost model in backend environment
This ensures binary compatibility when loading the model
"""
import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import xgboost as xgb
import os

print("="*60)
print("RETRAINING XGBOOST MODEL IN BACKEND ENVIRONMENT")
print("="*60)

# Load data
data_path = os.path.join(os.path.dirname(__file__), 'landslides_combined.csv')
df = pd.read_csv(data_path)
print(f"\n✓ Dataset loaded: {df.shape}")

# Drop metadata columns
metadata_cols = ['event_id', 'point_id', 'event_date', 'latitude', 'longitude', 
                 'landslide_trigger', 'landslide_size', 'fatality_count', 
                 'admin_division_name', 'system:index', '.geo']
df_clean = df.drop(columns=metadata_cols, errors='ignore')

# Handle missing values
df_clean = df_clean.copy()
df_clean['soil_type'] = df_clean['soil_type'].fillna(df_clean['soil_type'].mode()[0])
df_clean['population'] = df_clean['population'].fillna(0)
df_clean['ndvi'] = df_clean['ndvi'].fillna(df_clean['ndvi'].median())
df_clean['ndwi'] = df_clean['ndwi'].fillna(df_clean['ndwi'].median())
df_clean[['rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d']] = \
    df_clean[['rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d']].fillna(0)
df_clean['elevation'] = df_clean['elevation'].fillna(df_clean['elevation'].median())
df_clean['slope'] = df_clean['slope'].fillna(df_clean['slope'].median())
df_clean['aspect'] = df_clean['aspect'].fillna(df_clean['aspect'].median())

# Drop road_distance and population
df_clean = df_clean.drop(columns=['road_distance_m', 'population'], errors='ignore')

# Separate features and target
X = df_clean.drop(columns=['label'])
y = df_clean['label']

print(f"\n✓ Features used: {list(X.columns)}")
print(f"✓ Feature count: {X.shape[1]}")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.30, random_state=42, stratify=y
)

# Scale features
print("\n✓ Scaling features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train XGBoost
print("\n✓ Training XGBoost model...")
model = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    eval_metric='logloss',
    use_label_encoder=False
)
model.fit(X_train_scaled, y_train)

# Evaluate
y_pred = model.predict(X_test_scaled)
y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]

print("\n" + "="*60)
print("MODEL PERFORMANCE")
print("="*60)
print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
print(f"Precision: {precision_score(y_test, y_pred):.4f}")
print(f"Recall:    {recall_score(y_test, y_pred):.4f}")
print(f"F1-Score:  {f1_score(y_test, y_pred):.4f}")
print(f"ROC-AUC:   {roc_auc_score(y_test, y_pred_proba):.4f}")

# Save models
model_dir = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(model_dir, exist_ok=True)

model_path = os.path.join(model_dir, 'xgboost_model.pkl')
scaler_path = os.path.join(model_dir, 'scaler.pkl')

with open(model_path, 'wb') as f:
    pickle.dump(model, f)
    
with open(scaler_path, 'wb') as f:
    pickle.dump(scaler, f)

print("\n" + "="*60)
print("✓ Model saved to:", model_path)
print("✓ Scaler saved to:", scaler_path)
print("="*60)

# Test loading immediately
print("\n✓ Testing model loading...")
with open(model_path, 'rb') as f:
    loaded_model = pickle.load(f)
with open(scaler_path, 'rb') as f:
    loaded_scaler = pickle.load(f)

# Make a test prediction
test_sample = X_test_scaled[0:1]
test_pred = loaded_model.predict_proba(test_sample)
print(f"✓ Test prediction successful: {test_pred}")

print("\n✓✓✓ RETRAINING COMPLETE! ✓✓✓")
print("Run: python tests/test_model_loading.py")
