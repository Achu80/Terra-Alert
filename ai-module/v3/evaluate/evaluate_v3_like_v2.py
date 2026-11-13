"""
Evaluate the installed TerraAlert v3 model and save the same kind of outputs v2 had:
  - roc_curve_v3.png
  - confusion_matrix_v3.png
  - feature_importance_v3.png
  - accuracy_table_v3.csv  (plus a printed table)

Scores are OUT-OF-FOLD: each landslide and control is scored by a model that never
saw its ~100 km area during training. This is the honest version of v2's test split.

Run from the repository root:
    py -3.11 ai-module/v3/evaluate/evaluate_v3_like_v2.py
"""
import json
import os
import sys

import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score, roc_curve)

_V3 = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # v3/ holds v3_common.py
sys.path.insert(0, _V3)
sys.path.insert(0, os.path.join(_V3, 'train'))                     # calibrate_thresholds_v3.py lives here
from calibrate_thresholds_v3 import out_of_fold_scores
from v3_common import FEATURES, MODELS_DIR, RESULTS_DIR, feature_matrix, load_best, load_dataset

MODEL_PATH = os.path.join(MODELS_DIR, 'xgboost_model_v3.pkl')
THRESHOLDS_PATH = os.path.join(RESULTS_DIR, 'risk_thresholds_v3.json')


def main():
    df = load_dataset()
    X = feature_matrix(df, 'v3')
    y = df['label'].to_numpy()
    best = load_best()

    # 1. Out-of-fold probabilities (every row scored by a model that never saw its area)
    probs = out_of_fold_scores(X, y, df['group'], best)

    # 2. The app's MODERATE cut-off (first alert level)
    with open(THRESHOLDS_PATH, encoding='utf-8') as f:
        cutoff = json.load(f)['thresholds']['MODERATE']
    preds = (probs >= cutoff).astype(int)

    # 3. Accuracy table
    tn, fp, fn, tp = confusion_matrix(y, preds).ravel()
    table = pd.DataFrame([{
        'accuracy': accuracy_score(y, preds),
        # average of "landslides caught" and "safe places cleared": fair when there are 2 safe rows per landslide
        'balanced_accuracy': balanced_accuracy_score(y, preds),
        'precision': precision_score(y, preds, zero_division=0),
        'recall': recall_score(y, preds, zero_division=0),
        'f1': f1_score(y, preds, zero_division=0),
        'roc_auc': roc_auc_score(y, probs),
        'alert_cutoff': cutoff,
        'true_positives': int(tp), 'false_negatives': int(fn),
        'false_positives': int(fp), 'true_negatives': int(tn),
    }])
    table.to_csv(os.path.join(RESULTS_DIR, 'accuracy_table_v3.csv'), index=False)
    print('\nAccuracy table (out-of-fold, at the MODERATE alert level):')
    print(table.T.to_string(header=False))

    # 4. ROC curve
    fpr, tpr, _ = roc_curve(y, probs)
    plt.figure(figsize=(6, 6))
    plt.plot(fpr, tpr, label=f'v3 tuned (AUC = {table.roc_auc[0]:.3f})')
    plt.plot([0, 1], [0, 1], 'k--', label='Random guess (0.5)')
    plt.xlabel('False positive rate')
    plt.ylabel('True positive rate (recall)')
    plt.title('ROC Curve (V3 - out-of-fold)')
    plt.legend(loc='lower right')
    plt.tight_layout()
    plt.savefig(os.path.join(RESULTS_DIR, 'roc_curve_v3.png'), dpi=300)
    plt.close()
    print('Saved: roc_curve_v3.png')

    # 5. Confusion matrix
    cm = np.array([[tn, fp], [fn, tp]])
    plt.figure(figsize=(6, 5))
    plt.imshow(cm, cmap='Blues')
    plt.colorbar()
    labels = ['No Landslide', 'Landslide']
    plt.xticks([0, 1], labels)
    plt.yticks([0, 1], labels)
    plt.xlabel('Predicted (alert at MODERATE or above)')
    plt.ylabel('Actual')
    plt.title('Confusion Matrix (V3 - out-of-fold)')
    for i in range(2):
        for j in range(2):
            plt.text(j, i, f'{cm[i, j]}', ha='center', va='center',
                     color='white' if cm[i, j] > cm.max() / 2 else 'black', fontsize=14)
    plt.tight_layout()
    plt.savefig(os.path.join(RESULTS_DIR, 'confusion_matrix_v3.png'), dpi=300)
    plt.close()
    print('Saved: confusion_matrix_v3.png')

    # 6. Feature importance (installed model, same 20 features as the app)
    model = joblib.load(MODEL_PATH)
    importance = pd.DataFrame({'feature': FEATURES, 'importance': model.feature_importances_})
    importance = importance.sort_values('importance', ascending=False)
    importance.to_csv(os.path.join(RESULTS_DIR, 'feature_importance_v3.csv'), index=False)
    top = importance.head(15).iloc[::-1]
    plt.figure(figsize=(8, 6))
    plt.barh(top['feature'], top['importance'], color='#2a78d6')
    plt.xlabel('Importance')
    plt.title('Top 15 Features (V3)')
    plt.tight_layout()
    plt.savefig(os.path.join(RESULTS_DIR, 'feature_importance_v3.png'), dpi=300)
    plt.close()
    print('Saved: feature_importance_v3.png, feature_importance_v3.csv')


if __name__ == '__main__':
    main()
