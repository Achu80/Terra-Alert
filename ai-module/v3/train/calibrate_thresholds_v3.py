"""
Pick v3's risk-level cut-offs on purpose, instead of using the default 0.5.

Why: v3 was trained on 1 landslide for every 2 safe rows, so its output is NOT a real-world probability,
and at the default 0.5 cut-off it only catches 29% of real landslides. For a warning app, a missed landslide
is the worst mistake, so we choose cut-offs by how many real landslides they catch (recall):

    MODERATE and above -> catches ~70% of landslides   (this is where alerts start)
    HIGH and above     -> catches ~40%
    CRITICAL           -> catches ~15%

The scores we use are "out-of-fold": each row is scored by a model that never saw its area during training
(5-fold spatial CV, same as evaluate_v2_vs_v3.py). Scoring rows the model trained on would look far too good.

Writes:
  ai-module/v3/results/risk_thresholds_v3.json          (read again by train_xgboost_v3.py on retrain)
  backend/ml/models/v3/meta.json                (adds risk_thresholds, turns plains_rule on)

Run: py -3.11 ai-module/v3/train/calibrate_thresholds_v3.py
"""
import json
import os
import sys

import numpy as np
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # v3/ holds v3_common.py
from v3_common import RESULTS_DIR, ROOT, feature_matrix, load_best, load_dataset, v3_inputs, v3_model

TARGET_RECALL = {'MODERATE': 0.70, 'HIGH': 0.40, 'CRITICAL': 0.15}
THRESHOLDS_JSON = os.path.join(RESULTS_DIR, 'risk_thresholds_v3.json')
BACKEND_META = os.path.join(ROOT, 'backend', 'ml', 'models', 'v3', 'meta.json')


def out_of_fold_scores(X, y, groups, best=None):
    """Every row scored by a model trained only on the OTHER 4 folds (other ~100 km areas).
    Uses the same settings as the installed model (best_params_v3.json from tune_v3.py, if present)."""
    p = np.zeros(len(y))
    for tr, te in StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=0).split(X, y, groups):
        scaler = StandardScaler().fit(v3_inputs(X.iloc[tr], best))
        model = v3_model(y[tr], best).fit(scaler.transform(v3_inputs(X.iloc[tr], best)), y[tr])
        p[te] = model.predict_proba(scaler.transform(X.iloc[te]))[:, 1]
    return p


def cutoff_for_recall(y, p, recall):
    """Highest cut-off that still flags `recall` of the real landslides."""
    landslide_scores = np.sort(p[y == 1])[::-1]          # landslide scores, highest first
    k = int(np.ceil(recall * len(landslide_scores)))     # how many landslides must be flagged
    return float(landslide_scores[k - 1])                # the k-th highest landslide score


def describe(y, p, cut):
    """What happens if we raise an alert for every score >= cut."""
    flagged = p >= cut
    caught = int((flagged & (y == 1)).sum())
    false_alarms = int((flagged & (y == 0)).sum())
    return {
        'cutoff': round(cut, 4),
        'recall': round(caught / (y == 1).sum(), 3),                       # landslides caught
        'precision': round(caught / max(flagged.sum(), 1), 3),             # alerts that were real
        'false_alarm_rate': round(false_alarms / (y == 0).sum(), 3),       # safe rows wrongly flagged
    }


def main():
    df = load_dataset()
    X, y = feature_matrix(df, 'v3'), df.label.to_numpy()
    best = load_best()
    print('settings:', 'tuned (best_params_v3.json)' if best else 'original (200 trees, depth 6)')
    p = out_of_fold_scores(X, y, df['group'], best)

    print(f'{len(y)} rows, {int(y.sum())} landslides\n')
    print('Old default cut-off 0.5:', describe(y, p, 0.5), '\n')

    levels = {}
    for level, recall in TARGET_RECALL.items():
        levels[level] = describe(y, p, cutoff_for_recall(y, p, recall))
        print(f'{level:9s} (target recall {recall:.0%}):', levels[level])

    thresholds = {level: v['cutoff'] for level, v in levels.items()}
    result = {
        'method': 'Cut-offs on out-of-fold v3 scores (5-fold spatial CV) chosen by target recall',
        'target_recall': TARGET_RECALL,
        'thresholds': thresholds,
        'at_each_cutoff': levels,
        'default_0_5': describe(y, p, 0.5),
    }
    with open(THRESHOLDS_JSON, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)

    # Install into the live model's meta.json (the backend reads it on start-up)
    with open(BACKEND_META, encoding='utf-8') as f:
        meta = json.load(f)
    meta['risk_thresholds'] = thresholds
    meta['plains_rule'] = True  # only 27 of 1,610 training rows are from plains - v3 never learned flat land
    with open(BACKEND_META, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)

    print(f'\nthresholds: {thresholds}')
    print(f'written to {THRESHOLDS_JSON} and {BACKEND_META}')


if __name__ == '__main__':
    main()
