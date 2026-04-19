import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, roc_curve
import xgboost as xgb
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

# Load engineered dataset
df = pd.read_csv('landslides_combined_engineered.csv')

print(f"Dataset loaded: {df.shape}")

# === DROP METADATA & LEAKY FEATURES ===
columns_to_drop = [
    'event_id', 'point_id', 'event_date', 
    'latitude', 'longitude', 
    'landslide_trigger', 'landslide_size', 'fatality_count', 
    'admin_division_name', 'system:index', '.geo',
    'population',  # Data leakage
    'road_distance_m'  # Placeholder -9999
]

# Drop columns that exist
df = df.drop(columns=[col for col in columns_to_drop if col in df.columns])

print(f"After dropping metadata: {df.shape}")

# Separate features and target
X = df.drop('label', axis=1)
y = df['label']

print(f"\n✅ Clean feature set: {len(X.columns)} features")
print(f"\nFeature columns:")
for i, col in enumerate(X.columns, 1):
    print(f"{i:2d}. {col}")

# Train-test split (70-30)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y
)

print(f"\nTrain set: {X_train.shape[0]} samples")
print(f"Test set: {X_test.shape[0]} samples")

# Normalize features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train XGBoost
print("\n🚀 Training XGBoost (with engineered features)...")
model = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    random_state=42,
    eval_metric='logloss'
)

model.fit(X_train_scaled, y_train)

# Predictions
y_pred = model.predict(X_test_scaled)
y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]

# Metrics
print("\n" + "="*60)
print("📊 MODEL PERFORMANCE (V2 - ENGINEERED FEATURES)")
print("="*60)
print(classification_report(y_test, y_pred, target_names=['Non-Landslide', 'Landslide']))

# Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
print("\nConfusion Matrix:")
print(cm)

# ROC-AUC
roc_auc = roc_auc_score(y_test, y_pred_proba)
print(f"\n🎯 ROC-AUC Score: {roc_auc:.4f}")

# Feature Importance (All features sorted)
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\n📈 Feature Importances (All):")
print(feature_importance.to_string(index=False))

# === VISUALIZATIONS ===

# 1. Confusion Matrix Heatmap
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=['Non-Landslide', 'Landslide'],
            yticklabels=['Non-Landslide', 'Landslide'])
plt.title('Confusion Matrix (V2 - Engineered Features)')
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.tight_layout()
plt.savefig('confusion_matrix_v2.png', dpi=300)
print("\n✅ Saved: confusion_matrix_v2.png")

# 2. ROC Curve
fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
plt.figure(figsize=(8, 6))
plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (AUC = {roc_auc:.4f})')
plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random')
plt.xlim([0.0, 1.0])
plt.ylim([0.0, 1.05])
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('ROC Curve (V2 - Engineered Features)')
plt.legend(loc="lower right")
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('roc_curve_v2.png', dpi=300)
print("✅ Saved: roc_curve_v2.png")

# 3. Feature Importance Plot (Top 15)
plt.figure(figsize=(10, 8))
top_15 = feature_importance.head(15)
sns.barplot(data=top_15, y='feature', x='importance', palette='viridis')
plt.title('Top 15 Feature Importances (V2)')
plt.xlabel('Importance')
plt.ylabel('Feature')
plt.tight_layout()
plt.savefig('feature_importance_v2.png', dpi=300)
print("✅ Saved: feature_importance_v2.png")

# Save model and scaler
joblib.dump(model, 'xgboost_model_v2.pkl')
joblib.dump(scaler, 'scaler_v2.pkl')
print("\n💾 Saved: xgboost_model_v2.pkl, scaler_v2.pkl")

print("\n" + "="*60)
print("🎉 TRAINING COMPLETE (V2)")
print("="*60)