"""
Train landslide model v4 and install it next to v2/v3 (they are never touched).

Same data and the same 20 live inputs as v3 (ai-module/v3), trained to be steadier for multi-day forecasts:
  - Monotone rain: more rain in any window can never lower the score (v3 lowered it in ~36% of rows).
  - Shallower, regularised trees: smaller day-to-day swings when the rain windows slide forward.
  - The four rain-ratio inputs are held at 0 during training, so the trees never use them. They blow up when
    recent rain is tiny (e.g. (r7 - r3) / r3 with r3 = 0.1 mm) and made forecasts jump. The backend still
    sends all 20 inputs; a constant column is simply never split on.

Writes ai-module/v4/REPORT.md and backend/ml/models/v4/model.pkl, scaler.pkl, meta.json
(picked up by backend/services/model_registry.py; select it in the app: admin mode -> Settings -> Prediction model).

Run: py -3.11 ai-module/v4/train_xgboost_v4.py
"""
import json
import os
import sys
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'v3'))
from v3_common import FEATURES, ROOT, SEED, XGB_PARAMS, feature_matrix, load_dataset  # noqa: E402
from utils.data_processor import DataProcessor  # noqa: E402

BACKEND_V4 = os.path.join(ROOT, 'backend', 'ml', 'models', 'v4')

# Inputs where more rain must never mean less risk
RAIN_UP = {'rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d', 'high_short_term_rain', 'sustained_heavy_rain'}
# Unstable ratio inputs the model is not allowed to use
UNUSED = ['rainfall_ratio_3d_7d', 'rainfall_ratio_7d_14d', 'rainfall_ratio_14d_30d', 'rainfall_acceleration']

V4_PARAMS = dict(n_estimators=400, max_depth=3, learning_rate=0.03, min_child_weight=5, subsample=0.8,
                 colsample_bytree=0.8, reg_lambda=5, eval_metric='logloss',
                 monotone_constraints='(' + ','.join('1' if f in RAIN_UP else '0' for f in FEATURES) + ')')
CV_REPEATS = 5


def without_unused(X):
    X = X.copy()
    X[UNUSED] = 0.0
    return X


def fit(X, y, version, seed=SEED):
    """(scaler, model) trained the way `version` ('v3' or 'v4') is trained."""
    params = dict(V4_PARAMS) if version == 'v4' else dict(XGB_PARAMS)
    params.update(random_state=seed, scale_pos_weight=(y == 0).sum() / max((y == 1).sum(), 1))
    X = without_unused(X) if version == 'v4' else X
    scaler = StandardScaler().fit(X)
    return scaler, xgb.XGBClassifier(**params).fit(scaler.transform(X), y)


def scores(scaler, model, X):
    return model.predict_proba(scaler.transform(X))[:, 1]


def rescored(X, rain_factor=1.0, daily=None, base_row=None):
    """Feature rows rebuilt from rain windows with the backend's own formulas."""
    rows = []
    for r in X.to_dict('records'):
        base = {k: r[k] for k in ('elevation', 'slope', 'aspect', 'ndvi', 'ndwi', 'soil_type')}
        base.update({f'rainfall_{d}d': r[f'rainfall_{d}d'] * rain_factor for d in (3, 7, 14, 30)})
        all_d = {**base, **DataProcessor._engineer_features(base)}
        rows.append([float(all_d[f]) for f in FEATURES])
    return pd.DataFrame(rows, columns=FEATURES)


def daily_jump(scaler, model, X, n=150, days=30):
    """Mean |day-to-day score change| over simulated 30-day wet/dry rain sequences at real training places."""
    rng = np.random.default_rng(0)
    out = []
    for i in rng.choice(len(X), n, replace=False):
        r = X.iloc[i]
        rain = list(np.full(30, r['rainfall_30d'] / 30)) + list(rng.gamma(0.6, max(r['rainfall_30d'], 30) / 18, days))
        rows = []
        for k in range(days):
            hist = rain[k:k + 30]
            rows.append({**r.to_dict(), **{f'rainfall_{d}d': sum(hist[-d:]) for d in (3, 7, 14, 30)}})
        s = scores(scaler, model, rescored(pd.DataFrame(rows))) * 100
        out.append(np.abs(np.diff(s)).mean())
    return round(float(np.mean(out)), 1)


def evaluate(df, X, y, version):
    """Unseen-area CV (repeated, grouped by 0.5 deg cell), Himachal held out, and forecast-stability checks."""
    hp = (df.region == 'Himachal Pradesh').to_numpy()
    temporal = df.kind.isin(['landslide', 'temporal_control']).to_numpy()
    auc, brier, auc_t = [], [], []
    for rep in range(CV_REPEATS):
        oof = np.zeros(len(X))
        for tr, te in StratifiedGroupKFold(5, shuffle=True, random_state=rep).split(X, y, df['group']):
            oof[te] = scores(*fit(X.iloc[tr], y[tr], version, seed=rep), X.iloc[te])
        auc.append(roc_auc_score(y, oof))
        brier.append(brier_score_loss(y, oof))
        auc_t.append(roc_auc_score(y[temporal], oof[temporal]))
    p_hp = scores(*fit(X[~hp], y[~hp], version), X[hp])

    scaler, model = fit(X, y, version)
    wetter = scores(scaler, model, rescored(X, 1.3))
    return {
        'spatial_cv_roc_auc': round(float(np.mean(auc)), 3),
        'spatial_cv_brier': round(float(np.mean(brier)), 3),
        'vs_same_place_other_year_roc_auc': round(float(np.mean(auc_t)), 3),
        'himachal_holdout_roc_auc': round(float(roc_auc_score(y[hp], p_hp)), 3),
        'more_rain_lower_score_share': round(float((wetter < scores(scaler, model, X) - 0.01).mean()), 3),
        'forecast_daily_jump': daily_jump(scaler, model, X),
    }


def write_report(m):
    rows = [
        ('Unseen areas ROC-AUC (higher = better)', 'spatial_cv_roc_auc'),
        ('Unseen areas Brier (lower = better)', 'spatial_cv_brier'),
        ('Rain response: landslide vs same place other year, ROC-AUC', 'vs_same_place_other_year_roc_auc'),
        ('Himachal held out ROC-AUC', 'himachal_holdout_roc_auc'),
        ('Rows where 30% more rain LOWERED the score (should be 0)', 'more_rain_lower_score_share'),
        ('Average day-to-day score jump in a 30-day forecast (lower = steadier)', 'forecast_daily_jump'),
    ]
    table = '\n'.join(f"| {label} | {m['v3'][key]} | {m['v4'][key]} |" for label, key in rows)
    text = f"""# Landslide model v4 vs v3

Generated {datetime.now().isoformat(timespec='seconds')} by `ai-module/v4/train_xgboost_v4.py`.
Same 1,610 rows and same 20 live inputs as v3. Unseen-area numbers are averaged over {CV_REPEATS} shuffled
5-fold splits grouped by 0.5 degree cell, so they differ slightly from v3/REPORT.md (one fixed split).

| Check | v3 | v4 |
|---|---|---|
{table}

## What changed
- **More rain never lowers the score** (monotone constraints on the 3/7/14/30-day rain inputs and heavy-rain flags).
- **Shallower, regularised trees** (depth 3, 400 trees at learning rate 0.03, row/column subsampling).
- **Rain-ratio inputs unused** - they explode when recent rain is near zero and made forecasts jump.

## Still true
ROC-AUC around 0.6 means the model ranks risk better than chance but is far from reliable on its own.
Forecast days far ahead also inherit the uncertainty of the rain forecast itself.
"""
    with open(os.path.join(HERE, 'REPORT.md'), 'w', encoding='utf-8') as f:
        f.write(text)


def main():
    df = load_dataset()
    X, y = feature_matrix(df, 'v3'), df.label.to_numpy()

    metrics = {v: evaluate(df, X, y, v) for v in ('v3', 'v4')}
    print(json.dumps(metrics, indent=1))
    write_report(metrics)

    scaler, model = fit(X, y, 'v4')
    os.makedirs(BACKEND_V4, exist_ok=True)
    joblib.dump(model, os.path.join(BACKEND_V4, 'model.pkl'))
    joblib.dump(scaler, os.path.join(BACKEND_V4, 'scaler.pkl'))
    meta = {
        'version': 'v4',
        'label': 'v4 (steady forecasts, IMERG rain)',
        'description': 'v3 data retrained so more rain never lowers risk, with simpler trees and without the '
                       'unstable rain-ratio inputs - steadier 7/14/30-day forecasts. IMERG rain, MODIS vegetation.',
        'rain_source': 'imerg',
        'veg_source': 'modis_sr',
        'plains_rule': False,
        'trained_at': datetime.now().isoformat(timespec='seconds'),
        'training_rows': df.kind.value_counts().to_dict(),
        'metrics': {**metrics['v4'], 'v3_spatial_cv_roc_auc': metrics['v3']['spatial_cv_roc_auc'],
                    'v3_forecast_daily_jump': metrics['v3']['forecast_daily_jump']},
    }
    with open(os.path.join(BACKEND_V4, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
    print(f'v4 trained on {len(df)} rows and installed in {BACKEND_V4}')


if __name__ == '__main__':
    main()
