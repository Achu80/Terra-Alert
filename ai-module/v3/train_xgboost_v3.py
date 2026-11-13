"""
Train the final v3 model on all rows and install it next to v2 (v2 is never touched).

Writes:
  ai-module/v3/xgboost_model_v3.pkl, scaler_v3.pkl
  backend/ml/models/v3/model.pkl, scaler.pkl, meta.json   (picked up by backend/services/model_registry.py)
The backend keeps using v2 until an admin selects v3 in the app.

Run after evaluate_v2_vs_v3.py (its metrics go into meta.json): py -3.11 ai-module/v3/train_xgboost_v3.py
"""
import json
import os
import shutil
from datetime import datetime

import joblib
from sklearn.preprocessing import StandardScaler

from v3_common import HERE, ROOT, feature_matrix, load_dataset, new_model

BACKEND_V3 = os.path.join(ROOT, 'backend', 'ml', 'models', 'v3')


def _saved_thresholds():
    path = os.path.join(HERE, 'risk_thresholds_v3.json')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f)['thresholds']


def main():
    df = load_dataset()
    X, y = feature_matrix(df, 'v3'), df.label.to_numpy()

    scaler = StandardScaler().fit(X)
    model = new_model(y).fit(scaler.transform(X), y)

    model_path = os.path.join(HERE, 'xgboost_model_v3.pkl')
    scaler_path = os.path.join(HERE, 'scaler_v3.pkl')
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)

    with open(os.path.join(HERE, 'metrics_v3.json'), encoding='utf-8') as f:
        ev = json.load(f)
    cv, hp = ev['spatial_cv']['v3']['all'], ev['himachal_holdout']['v3']['all']

    meta = {
        'version': 'v3',
        'label': 'v3 (fair data, IMERG rain)',
        'description': 'Same 20 inputs as v2, retrained with nearby same-day and same-place other-year '
                       'controls; NASA IMERG rain and MODIS vegetation for training and live use.',
        'rain_source': 'imerg',
        'veg_source': 'modis_sr',
        # Always on: only 27 of 1,610 training rows are from plains (Haryana/Delhi/UP), so v3 never learned flat land
        # and could flag Delhi or Lucknow from monsoon rain alone. (The old auto-check looked at those same 27 rows.)
        'plains_rule': True,
        # Risk-level cut-offs chosen by calibrate_thresholds_v3.py (run it after retraining to refresh them)
        'risk_thresholds': _saved_thresholds(),
        'trained_at': datetime.now().isoformat(timespec='seconds'),
        'training_rows': ev['rows'],
        'metrics': {
            'spatial_cv_roc_auc': cv['roc_auc'],
            'spatial_cv_accuracy': cv['accuracy'],
            'himachal_holdout_roc_auc': hp['roc_auc'],
            'himachal_holdout_accuracy': hp['accuracy'],
            'v2_spatial_cv_roc_auc': ev['spatial_cv']['v2']['all']['roc_auc'],
            'v2_himachal_holdout_roc_auc': ev['himachal_holdout']['v2']['all']['roc_auc'],
        },
    }

    os.makedirs(BACKEND_V3, exist_ok=True)
    shutil.copyfile(model_path, os.path.join(BACKEND_V3, 'model.pkl'))
    shutil.copyfile(scaler_path, os.path.join(BACKEND_V3, 'scaler.pkl'))
    with open(os.path.join(BACKEND_V3, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
    print(f'v3 trained on {len(df)} rows and installed in {BACKEND_V3}')
    print(json.dumps(meta['metrics'], indent=1), '| plains_rule:', meta['plains_rule'])


if __name__ == '__main__':
    main()
