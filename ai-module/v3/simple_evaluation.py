"""
Question: What is the most complicated code you have written independently
without AI or anyone else's assistance?

Answer: An evaluation script for the v3 landslide prediction model in my
TerraAlert project. It loads the trained XGBoost model, measures its
accuracy and ROC-AUC on the training data, then retests it with 5-fold
GroupKFold cross-validation on map areas the model has never seen, and
compares the two scores to check for overfitting.

I wrote this script myself, except the GroupKFold cross-validation part
(Step 4), where a friend helped me. The model and the helper functions in
v3_common were built by my project team.

Run:  python ai-module/v3/simple_evaluation.py
"""

import joblib
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler

from v3_common import HERE, feature_matrix, load_dataset, new_model

# ---------- STEP 1: LOAD ----------
df = load_dataset()
X = feature_matrix(df, 'v3')
y = df['label'].to_numpy()

model = joblib.load(HERE + '/xgboost_model_v3.pkl')
scaler = joblib.load(HERE + '/scaler_v3.pkl')

print('Rows:', X.shape[0], ' Features:', X.shape[1])

# ---------- STEP 2: PREDICT ----------
probs = model.predict_proba(scaler.transform(X))[:, 1]
answers = (probs >= 0.5).astype(int)

# ---------- STEP 3: GRADE (on data it already saw) ----------
train_auc = roc_auc_score(y, probs)
print('Accuracy on training data:', round(accuracy_score(y, answers), 3))
print('ROC-AUC on training data: ', round(train_auc, 3))

# ---------- STEP 4: RETEST (on map areas it never saw) ----------
scores = []
for train_rows, test_rows in GroupKFold(n_splits=5).split(X, y, groups=df['group']):
    fresh_scaler = StandardScaler().fit(X.iloc[train_rows])
    fresh_model = new_model(y[train_rows])
    fresh_model.fit(fresh_scaler.transform(X.iloc[train_rows]), y[train_rows])

    test_probs = fresh_model.predict_proba(fresh_scaler.transform(X.iloc[test_rows]))[:, 1]
    scores.append(roc_auc_score(y[test_rows], test_probs))

cv_auc = sum(scores) / len(scores)
print('ROC-AUC on unseen areas:  ', round(cv_auc, 3))

# ---------- STEP 5: COMPARE ----------
gap = train_auc - cv_auc
print('Gap (overfitting):        ', round(gap, 3))
