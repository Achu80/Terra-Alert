"""
Train the final v3 model on all rows and install it (v2 and v4 are never touched). Same 20 inputs as before.

Order:  tune_v3.py (picks settings, optional)  ->  this script  ->  calibrate_thresholds_v3.py (run automatically)

Writes:
  ai-module/v3/models/xgboost_model_v3.pkl, scaler_v3.pkl
  backend/ml/models/v3/model.pkl, scaler.pkl, meta.json   (picked up by backend/services/model_registry.py)
Restart the backend afterwards to load it.

Run: py -3.11 ai-module/v3/train/train_xgboost_v3.py
"""
import json
import os
import shutil
import sys
from datetime import datetime

import joblib
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # v3/ holds v3_common.py
import calibrate_thresholds_v3
from v3_common import MODELS_DIR, RESULTS_DIR, ROOT, UNSTABLE, feature_matrix, load_best, load_dataset, v3_inputs, v3_model

BACKEND_V3 = os.path.join(ROOT, 'backend', 'ml', 'models', 'v3')

# Inputs whose live value is checked against the training range (backend adds a warning when outside it)
RANGE_CHECKED = ['elevation', 'slope', 'ndvi', 'ndwi', 'rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d']


def _metrics():
    """Honest scores for meta.json: from tune_v3.py when it ran, else from evaluate_v2_vs_v3.py."""
    tuned = os.path.join(RESULTS_DIR, 'tune_results_v3.json')
    if os.path.exists(tuned):
        with open(tuned, encoding='utf-8') as f:
            r = json.load(f)
        t, o = r['tuned_fair_test'], r['original_fair_test']
        return {
            'test': 'nested spatial CV, ~100 km areas never seen in training (mean of 3 splits)',
            'roc_auc': t['roc_auc']['mean'],
            'roc_auc_vs_nearby_same_day': t['roc_auc_vs_nearby_same_day']['mean'],
            'roc_auc_vs_same_place_other_year': t['roc_auc_vs_same_place_other_year']['mean'],
            'recall_at_alert_level': 0.70,
            'precision_at_alert_level': t['precision_at_70pct_recall']['mean'],
            'false_alarm_at_alert_level': t['false_alarm_at_70pct_recall']['mean'],
            'accuracy_at_alert_level': t['accuracy_at_70pct_recall']['mean'],
            'overfit_gap': r['final_check']['overfit_gap'],
            'original_v3_roc_auc_same_test': o['roc_auc']['mean'],
        }
    with open(os.path.join(RESULTS_DIR, 'metrics_v3.json'), encoding='utf-8') as f:
        ev = json.load(f)
    cv = ev['spatial_cv']['v3']['all']
    return {'spatial_cv_roc_auc': cv['roc_auc'], 'spatial_cv_accuracy': cv['accuracy']}


def main():
    df = load_dataset()
    X, y = feature_matrix(df, 'v3'), df.label.to_numpy()

    best = load_best()   # None -> original settings (200 trees, depth 6)
    X_train = v3_inputs(X, best)
    scaler = StandardScaler().fit(X_train)
    model = v3_model(y, best).fit(scaler.transform(X_train), y)

    model_path = os.path.join(MODELS_DIR, 'xgboost_model_v3.pkl')
    scaler_path = os.path.join(MODELS_DIR, 'scaler_v3.pkl')
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)

    meta = {
        'version': 'v3',
        'label': 'v3 (fair data, IMERG rain)',
        'description': 'Tuned Nov 2026: smaller trees (no memorising), more rain never lowers risk, 5 broken inputs ignored. Same 20 inputs; NASA IMERG rain and MODIS vegetation, trained on nearby same-day and same-place other-year controls.',
        'rain_source': 'imerg',
        'veg_source': 'modis_sr',
        # Always on: only 27 of 1,610 training rows are from plains (Haryana/Delhi/UP), so v3 never learned flat land
        # and could flag Delhi or Lucknow from monsoon rain alone. (The old auto-check looked at those same 27 rows.)
        'plains_rule': True,
        # risk_thresholds are added right below by calibrate_thresholds_v3.py, for THIS model
        'trained_at': datetime.now().isoformat(timespec='seconds'),
        'training_rows': df.kind.value_counts().to_dict(),
        'settings': best or 'original (200 trees, depth 6)',
        'ignored_inputs': UNSTABLE if best and best.get('ignore_unstable') else [],
        # Live inputs outside these ranges get a warning: the model never saw such values
        'feature_ranges': {f: [round(float(X[f].min()), 3), round(float(X[f].max()), 3)] for f in RANGE_CHECKED},
        'expected_rain_source_used': 'imerg_v07',
        'metrics': _metrics(),
    }

    os.makedirs(BACKEND_V3, exist_ok=True)
    shutil.copyfile(model_path, os.path.join(BACKEND_V3, 'model.pkl'))
    shutil.copyfile(scaler_path, os.path.join(BACKEND_V3, 'scaler.pkl'))
    with open(os.path.join(BACKEND_V3, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
    print(f'v3 trained on {len(df)} rows and installed in {BACKEND_V3}')
    print(json.dumps(meta['metrics'], indent=1), '| plains_rule:', meta['plains_rule'])

    # Cut-offs must come from THIS model, so pick them now (writes risk_thresholds into meta.json)
    calibrate_thresholds_v3.main()


if __name__ == '__main__':
    main()
