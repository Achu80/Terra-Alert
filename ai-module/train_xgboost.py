import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report
import xgboost as xgb

# Load data
df = pd.read_csv('landslides_combined.csv')

print("Dataset loaded:", df.shape)

# Drop metadata columns (NOT features)
metadata_cols = ['event_id', 'point_id', 'event_date', 'latitude', 'longitude', 
                 'landslide_trigger', 'landslide_size', 'fatality_count', 'admin_division_name']

df_clean = df.drop(columns=metadata_cols, errors='ignore')

# Handle missing values
df_clean['soil_type'].fillna(df_clean['soil_type'].mode()[0], inplace=True)
df_clean['population'].fillna(0, inplace=True)
df_clean['ndvi'].fillna(df_clean['ndvi'].median(), inplace=True)
df_clean['ndwi'].fillna(df_clean['ndwi'].median(), inplace=True)
df_clean[['rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d']] = \
    df_clean[['rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d']].fillna(0)
df_clean['elevation'].fillna(df_clean['elevation'].median(), inplace=True)
df_clean['slope'].fillna(df_clean['slope'].median(), inplace=True)
df_clean['aspect'].fillna(df_clean['aspect'].median(), inplace=True)

# Drop road_distance (placeholder)
df_clean = df_clean.drop(columns=['road_distance_m'], errors='ignore')

# Separate features and target
X = df_clean.drop(columns=['label'])
y = df_clean['label']

print(f"\nFeatures used: {list(X.columns)}")
print(f"Feature count: {X.shape[1]}")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.30, random_state=42, stratify=y
)

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train XGBoost
print("\nTraining XGBoost...")
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

# Predictions
y_pred = model.predict(X_test_scaled)
y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]

# Evaluation
print("\n" + "="*50)
print("MODEL PERFORMANCE")
print("="*50)
print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
print(f"Precision: {precision_score(y_test, y_pred):.4f}")
print(f"Recall:    {recall_score(y_test, y_pred):.4f}")
print(f"F1-Score:  {f1_score(y_test, y_pred):.4f}")
print(f"ROC-AUC:   {roc_auc_score(y_test, y_pred_proba):.4f}")

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['No Landslide', 'Landslide']))

# Feature importance
feature_importance = pd.DataFrame({
    'Feature': X.columns,
    'Importance': model.feature_importances_
}).sort_values(by='Importance', ascending=False)

print("\nTop 10 Feature Importance:")
print(feature_importance.head(10))

# Save model
with open('xgboost_model.pkl', 'wb') as f:
    pickle.dump(model, f)

with open('scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)

print("\n✓ Model saved as xgboost_model.pkl")
print("✓ Scaler saved as scaler.pkl")