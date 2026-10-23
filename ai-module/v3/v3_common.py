"""Shared helpers for training / evaluating v3 (and grading v2 on the same rows)."""
import os
import sys

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
    df[numeric] = df[numeric].apply(pd.to_numeric, errors='coerce').fillna(0)
    df['label'] = df['label'].astype(int)
    df.to_csv(DATASET_CSV, index=False)  # merged copy for the team
    return df.drop_duplicates('row_id').sort_values('row_id').reset_index(drop=True)


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


def plains_mask(X):
    """Rows the backend's plains rule would override (elevation < 800 m and slope < 15 deg)."""
    return (X['elevation'] < 800) & (X['slope'] < 15)
