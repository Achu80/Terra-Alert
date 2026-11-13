"""Candidate check: does adding the 175 new events (with their controls) make v3 better on HONEST tests?

Compares two training sets with the SAME settings (installed tuned parameters, same 20 inputs, same rules):
  A. current data      : the 1,610 rows the installed model was trained on
  B. current + new     : A plus the 501 new rows (175 landslides, 174 temporal, 152 spatial controls)

Tests (nothing is written to the installed model or to the live results):
  1. Out-of-fold, 5 spatial folds (1 x 1 degree blocks): every row scored by a model that never saw its area.
  2. Time-based: train on events before 2014, test on 2014-2016 (the same split as time_split_test_v3.py).

Writes only: ai-module/v3/results/candidate_combined_v3.json

Run from the repository root:
    py -3.11 ai-module/v3/evaluate/candidate_combined_v3.py
"""
import json
import os
import sys

import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # v3/ holds v3_common.py
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'train'))
from v3_common import (DATA_V3, RESULTS_DIR, feature_matrix, fair_groups, load_best, load_dataset,  # noqa: E402
                       v3_inputs, v3_model)
from calibrate_thresholds_v3 import cutoff_for_recall, out_of_fold_scores  # noqa: E402

NEW_PART = os.path.join(DATA_V3, 'landslides_v3_new_part.csv')
OUT_JSON = os.path.join(RESULTS_DIR, 'candidate_combined_v3.json')
NUMERIC = ['row_id', 'label', 'lat', 'lon', 'elevation', 'slope', 'aspect', 'ndvi', 'ndwi', 'soil_type',
           'rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d', 'ndvi_v2', 'ndwi_v2',
           'rainfall_3d_v2', 'rainfall_7d_v2', 'rainfall_14d_v2', 'rainfall_30d_v2']


def load_new():
    d = pd.read_csv(NEW_PART)
    d[NUMERIC] = d[NUMERIC].apply(pd.to_numeric, errors='coerce')
    d['label'] = d['label'].astype(int)
    return d


def summarise(y, p):
    cut = cutoff_for_recall(y, p, 0.70)
    flagged = p >= cut
    caught = int((flagged & (y == 1)).sum())
    false_alarms = int((flagged & (y == 0)).sum())
    return {
        'roc_auc': round(float(roc_auc_score(y, p)), 4),
        'cutoff_for_70pct_recall': round(cut, 4),
        'recall': round(caught / int((y == 1).sum()), 4),
        'false_alarm_rate': round(false_alarms / int((y == 0).sum()), 4),
        'landslides': int((y == 1).sum()), 'rows': int(len(y)),
    }


def time_split(df, best):
    year = pd.to_datetime(df.loc[df.kind == 'landslide'].set_index('event_id')['date']).dt.year
    row_year = df['event_id'].map(year).to_numpy()
    train, test = row_year < 2014, row_year >= 2014
    X = feature_matrix(df, 'v3')
    y = df['label'].to_numpy()
    Xtr = v3_inputs(X[train], best)
    scaler = StandardScaler().fit(Xtr)
    model = v3_model(y[train], best).fit(scaler.transform(Xtr), y[train])
    p = model.predict_proba(scaler.transform(v3_inputs(X[test], best)))[:, 1]
    return summarise(y[test], p)


def main():
    best = load_best()
    old = load_dataset()
    new = load_new()
    # Columns the builder wrote for new rows match the old table; keep the same columns, same order.
    cols = list(old.columns)
    combined = pd.concat([old[cols], new[cols]], ignore_index=True)
    combined = combined.drop_duplicates('row_id').reset_index(drop=True)
    combined['group'] = fair_groups(combined)  # 1x1 degree blocks, same as load_dataset()

    result = {'settings': 'installed tuned parameters, same 20 inputs, same control rules'}
    for name, df in [('A_current_data', old), ('B_current_plus_new', combined)]:
        X = feature_matrix(df, 'v3')
        y = df['label'].to_numpy()
        p = out_of_fold_scores(X, y, df['group'], best)
        result[name] = {'out_of_fold': summarise(y, p), 'time_split': time_split(df, best)}
        print(name, json.dumps(result[name], indent=2))

    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)
    print('Saved:', OUT_JSON)


if __name__ == '__main__':
    main()
