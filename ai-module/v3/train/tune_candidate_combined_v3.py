"""Re-tune the v3 parameters on the COMBINED data (old 1,610 rows + 501 new rows), honestly.

Same method as tune_v3.py (nested cross-validation, so the reported score comes from areas the tuning never saw).
What is different: it uses the combined data, and it writes to candidate files only. It does not touch
best_params_v3.json or any installed model.

Writes:
  ai-module/v3/results/tune_candidate_combined_v3.json   (all numbers, both settings compared)
  ai-module/v3/results/best_params_candidate_v3.json    (the settings to install, only if they win)

Run from the repository root:
    py -3.11 ai-module/v3/train/tune_candidate_combined_v3.py
"""
import json
import os
import sys

import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedGroupKFold

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))  # v3/ holds v3_common.py
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'evaluate'))

import tune_v3 as t  # noqa: E402  (same search, scoring and report functions as the installed tuning)
from candidate_combined_v3 import load_new  # noqa: E402
from v3_common import DATA_V3, RESULTS_DIR, feature_matrix, load_dataset, load_best  # noqa: E402
from v3_common import fair_groups  # noqa: E402

OUT_JSON = os.path.join(RESULTS_DIR, 'tune_candidate_combined_v3.json')
OUT_BEST = os.path.join(RESULTS_DIR, 'best_params_candidate_v3.json')
OUTER_SEEDS = [0]     # one honest split for speed (the full run was too slow to finish)
t.N_CONFIGS = 15      # random settings per inner search (tune_v3 uses 40)


def combined_data():
    old = load_dataset()
    new = load_new()
    cols = list(old.columns)
    df = pd.concat([old[cols], new[cols]], ignore_index=True).drop_duplicates('row_id').reset_index(drop=True)
    df['group'] = fair_groups(df)
    return df


def main():
    df = combined_data()
    X, y = feature_matrix(df, 'v3'), df.label.to_numpy()
    groups = df['group']
    installed = load_best()
    print(f'Combined data: {len(df)} rows, {int(y.sum())} landslides')

    print('A. Installed settings on combined data (honest, 5 area folds x 3 splits)')
    inst_runs = [t.report(df, y, t.oof(X, y, groups, installed, 5, s)) for s in OUTER_SEEDS]
    inst = t.mean_sd(inst_runs)
    print('   ROC-AUC', inst['roc_auc'])

    print('B. Nested tuning on combined data (slow)')
    tuned_runs, chosen = [], []
    for s in OUTER_SEEDS:
        p = np.zeros(len(y))
        folds = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=s).split(X, y, groups)
        for k, (tr, te) in enumerate(folds):
            best, _ = t.search(X.iloc[tr].reset_index(drop=True), y[tr], groups[tr], seed=100 * s + k)
            chosen.append(best)
            p[te] = t.fit_score(X.iloc[tr], y[tr], X.iloc[te], best)
        tuned_runs.append(t.report(df, y, p))
        print(f'   split {s}: ROC-AUC {tuned_runs[-1]["roc_auc"]}')
    tuned = t.mean_sd(tuned_runs)

    print('C. Settings to install: same search on all combined rows')
    final, inner_auc = t.search(X, y, groups, seed=999)
    final_check = t.report(df, y, t.oof(X, y, groups, final, 5, 0), X, final)

    result = {
        'rows': len(df), 'landslides': int(y.sum()),
        'installed_settings_on_combined': inst,
        'nested_tuned_on_combined': tuned,
        'chosen_in_each_outer_fold': chosen,
        'final_settings': final,
        'final_settings_check': final_check,
    }
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
    with open(OUT_BEST, 'w', encoding='utf-8') as f:
        json.dump(final, f, indent=2)

    print('\n' + '=' * 80)
    print(f'{"(unseen areas, mean of 3 splits)":40s}{"installed":>14s}{"tuned":>14s}')
    for k in ['roc_auc', 'false_alarm_at_70pct_recall', 'precision_at_70pct_recall']:
        print(f'{k:40s}{inst[k]["mean"]:>14.3f}{tuned[k]["mean"]:>14.3f}')
    print('Saved:', OUT_JSON, '\n      ', OUT_BEST)


if __name__ == '__main__':
    main()
