"""Shared helpers for training / evaluating v3 (and grading v2 on the same rows)."""
import os
import sys

import numpy as np
import pandas as pd
import xgboost as xgb

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'backend'))

from utils.data_processor import DataProcessor  # noqa: E402  (the backend's own feature code)

DATASET_CSV = os.path.join(HERE, 'landslides_v3_dataset.csv')
FEATURES = DataProcessor.FEATURE_ORDER
SEED = 42

# Same settings as ai-module/train_xgboost_v2.py, so only the data differs; class weights for 1 slide : 2 controls
XGB_PARAMS = dict(n_estimators=200, max_depth=6, learning_rate=0.1, random_state=SEED, eval_metric='logloss')


def load_dataset():
    # The builder writes one file per shard (landslides_v3_part0.csv ...); merge them into one table
    parts = [os.path.join(HERE, f) for f in sorted(os.listdir(HERE)) if f.startswith('landslides_v3_part') and f.endswith('.csv')]
    df = pd.concat([pd.read_csv(p) for p in parts if os.path.getsize(p) > 0], ignore_index=True)
    # Merged part files can come back as text ("object") columns - force numbers for labels and measurements
    numeric = ['row_id', 'label', 'lat', 'lon', 'elevation', 'slope', 'aspect', 'ndvi', 'ndwi', 'soil_type',
               'rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d', 'ndvi_v2', 'ndwi_v2',
               'rainfall_3d_v2', 'rainfall_7d_v2', 'rainfall_14d_v2', 'rainfall_30d_v2']
    df[numeric] = df[numeric].apply(pd.to_numeric, errors='coerce')
    # Missing data stays missing (NaN) - XGBoost handles it. fillna(0) used to turn "no data" into "no rain".
    missing = int(df[numeric].isna().any(axis=1).sum())
    if missing:
        print(f'⚠ {missing} rows have a missing value (kept as NaN, not 0)')
    df['label'] = df['label'].astype(int)
    df = df.drop_duplicates('row_id').sort_values('row_id').reset_index(drop=True)
    df['group'] = fair_groups(df)
    return df


def save_merged_csv(df):
    """Merged copy for the team. Call explicitly - loading no longer rewrites files as a side effect."""
    df.to_csv(DATASET_CSV, index=False)


def fair_groups(df, cell_deg=1.0):
    """Cross-validation groups: 1 x 1 degree blocks (~100 km) of the source landslide event.

    Rows in a group always land in the same fold. The old 0.5 degree cells (~50 km) let two landslides from the
    same storm on the same day sit in neighbouring cells, one in training and one in testing - the test then
    partly checks memory of that storm, not prediction. Controls inherit their event's block (they share its
    event_id), so a landslide and its controls are never split.
    """
    events = df[df.kind == 'landslide'].set_index('event_id')[['lat', 'lon']]
    block = (np.floor(events.lat / cell_deg).astype(int).astype(str) + '_' +
             np.floor(events.lon / cell_deg).astype(int).astype(str))
    return df['event_id'].map(block).fillna(df['group']).to_numpy()


def feature_matrix(df, recipe='v3'):
    """20 model inputs per row. recipe='v3': IMERG rain + MODIS SR vegetation; 'v2': CHIRPS + Sentinel-2/MODIS."""
    rows = []
    for r in df.to_dict('records'):
        base = {k: r[k] for k in ('elevation', 'slope', 'aspect', 'soil_type')}
        if recipe == 'v2':
            base.update(ndvi=r['ndvi_v2'], ndwi=r['ndwi_v2'],
                        **{f'rainfall_{d}d': r[f'rainfall_{d}d_v2'] for d in (3, 7, 14, 30)})
        else:
            base.update(ndvi=r['ndvi'], ndwi=r['ndwi'], **{f'rainfall_{d}d': r[f'rainfall_{d}d'] for d in (3, 7, 14, 30)})
        # Same formulas as live predictions (prepare_model_input), without its per-row debug printing
        all_data = {**base, **DataProcessor._engineer_features(base)}
        rows.append([float(all_data.get(name) or 0) for name in FEATURES])
    return pd.DataFrame(rows, columns=FEATURES)


def new_model(y):
    pos = int((y == 1).sum())
    neg = int((y == 0).sum())
    return xgb.XGBClassifier(**XGB_PARAMS, scale_pos_weight=neg / max(pos, 1))


# ---------------------------------------------------------------------------------------------- tuned v3
# The live app always sends the same 20 inputs. Tuning only changes HOW the model learns from them.
BEST_JSON = os.path.join(HERE, 'best_params_v3.json')

# More rain must never LOWER the risk (physics). Without this rule the trees learn noise like
# "40 mm is riskier than 60 mm" from a handful of rows.
RAIN_UP = ['rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d', 'high_short_term_rain', 'sustained_heavy_rain']

# Inputs that are broken in the data (see REPORT / review item 5). They stay in the 20-input list the app sends,
# but are held constant during training so the trees never split on them - live values are then simply ignored.
#   north_facing: aspect is a 1 km AVERAGE of directions, which never lands in the north range -> always 0
#   ratio / acceleration inputs: divide by small rain totals and explode (acceleration reaches 9,221)
UNSTABLE = ['north_facing', 'rainfall_ratio_3d_7d', 'rainfall_ratio_7d_14d', 'rainfall_ratio_14d_30d',
            'rainfall_acceleration']


def load_best():
    """Settings chosen by tune_v3.py, or None (then the original v2-copied settings are used)."""
    if not os.path.exists(BEST_JSON):
        return None
    import json
    with open(BEST_JSON, encoding='utf-8') as f:
        return json.load(f)


def v3_inputs(X, best):
    """The 20 inputs as the tuned model sees them during TRAINING (ignored inputs held at 0)."""
    X = X.copy()
    if best and best.get('ignore_unstable'):
        X[UNSTABLE] = 0.0
    return X


def v3_model(y, best, n_jobs=4):
    """XGBoost with the tuned settings (+ the 'more rain never lowers risk' rule when chosen)."""
    if not best:
        return new_model(y)
    params = dict(best['params'])
    if best.get('monotone_rain'):
        params['monotone_constraints'] = '(' + ','.join('1' if f in RAIN_UP else '0' for f in FEATURES) + ')'
    pos, neg = int((y == 1).sum()), int((y == 0).sum())
    return xgb.XGBClassifier(**params, random_state=SEED, eval_metric='logloss', n_jobs=n_jobs,
                             scale_pos_weight=neg / max(pos, 1))


def plains_mask(X):
    """Rows the backend's plains rule would override (elevation < 800 m and slope < 15 deg)."""
    return (X['elevation'] < 800) & (X['slope'] < 15)
