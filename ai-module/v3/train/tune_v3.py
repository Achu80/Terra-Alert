"""
Tune v3 honestly: find the settings that PREDICT best on unseen areas, without changing the 20 inputs.

Plain-language idea
-------------------
v3 used 200 trees of depth 6 (copied from v2) on only 1,610 rows. Deep trees can memorise rows - that is
overfitting: great on training rows, weak on new places. We try many smaller/larger settings and keep the one
that does best on areas it never trained on.

The trap: if we pick the "best" settings using the same test we then report, the reported number is too rosy
(we picked the luckiest one). So we use NESTED cross-validation:

    outer loop (5 folds of whole areas)  -> gives the honest score we report
      inner loop (4 folds, training part only) -> picks the settings; never sees the outer test area

Also tried (each kept only if the inner loop prefers it):
    monotone_rain    more rain can never lower the risk (physics rule)
    ignore_unstable  hold the 5 broken inputs constant so the trees cannot use them (see v3_common.UNSTABLE)

Writes ai-module/v3/results/best_params_v3.json and tune_results_v3.json
Run: py -3.11 ai-module/v3/train/tune_v3.py        (~5-15 min)
"""
import json
import os
import random
import sys

import numpy as np
import pandas as pd
from joblib import Parallel, delayed
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # v3/ holds v3_common.py
from v3_common import BEST_JSON, DATA_V3, RESULTS_DIR, feature_matrix, load_dataset, new_model, v3_inputs, v3_model

N_CONFIGS = 40          # random settings tried in each inner search
OUTER_SEEDS = [0, 1, 2]  # repeat the honest test with 3 different area splits, to see how stable it is
RESULTS_JSON = os.path.join(RESULTS_DIR, 'tune_results_v3.json')

SPACE = {
    'max_depth': [2, 3, 4, 5],                 # how many questions each tree may ask in a row
    'n_estimators': [100, 200, 300, 500],      # how many trees
    'learning_rate': [0.02, 0.05, 0.1],        # how much each new tree may correct the previous ones
    'min_child_weight': [1, 3, 5, 10, 20],     # smallest group of rows a tree may single out (bigger = less memorising)
    'subsample': [0.6, 0.8, 1.0],              # share of rows each tree sees (randomness fights memorising)
    'colsample_bytree': [0.5, 0.7, 0.9],       # share of inputs each tree sees
    'reg_lambda': [1, 3, 10],                  # penalty on extreme leaf values
    'gamma': [0, 0.5, 1],                      # minimum improvement required to add a split
}


def random_configs(n, seed):
    rnd = random.Random(seed)
    return [{'params': {k: rnd.choice(v) for k, v in SPACE.items()},
             'monotone_rain': rnd.choice([True, False]),
             'ignore_unstable': rnd.choice([True, False])} for _ in range(n)]


def fit_score(X_tr, y_tr, X_te, best):
    """Train on one part, return risk scores (0-1) for the other part. best=None -> original v3 settings."""
    sc = StandardScaler().fit(v3_inputs(X_tr, best))
    model = (v3_model(y_tr, best, n_jobs=1) if best else new_model(y_tr))
    model.fit(sc.transform(v3_inputs(X_tr, best)), y_tr)
    return model.predict_proba(sc.transform(X_te))[:, 1]  # live inputs are NOT zeroed - the trees just ignore them


def oof(X, y, groups, best, n_splits, seed):
    p = np.zeros(len(y))
    for tr, te in StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=seed).split(X, y, groups):
        p[te] = fit_score(X.iloc[tr], y[tr], X.iloc[te], best)
    return p


def search(X, y, groups, seed):
    """Inner loop: score every config with grouped CV on THIS data only, return the best one."""
    configs = random_configs(N_CONFIGS, seed)
    aucs = Parallel(n_jobs=4)(delayed(lambda c: roc_auc_score(y, oof(X, y, groups, c, 4, seed)))(c) for c in configs)
    return configs[int(np.argmax(aucs))], float(max(aucs))


def report(df, y, p, X=None, best='skip'):
    """Numbers a non-expert can read, all from out-of-fold scores (areas the model did not train on)."""
    def auc(kind):
        m = ((df.kind == 'landslide') | (df.kind == kind)).to_numpy()
        return roc_auc_score(y[m], p[m])
    cut = np.sort(p[y == 1])[::-1][int(np.ceil(0.7 * (y == 1).sum())) - 1]       # catches 70% of landslides
    flagged = p >= cut
    r = {
        'roc_auc': roc_auc_score(y, p),
        'roc_auc_vs_nearby_same_day': auc('spatial_control'),
        'roc_auc_vs_same_place_other_year': auc('temporal_control'),
        'false_alarm_at_70pct_recall': float(flagged[y == 0].mean()),
        'precision_at_70pct_recall': float(y[flagged].mean()),
        'accuracy_at_70pct_recall': float((flagged == (y == 1)).mean()),
    }
    if best != 'skip':  # overfitting check: score on rows it trained on vs unseen areas
        sc = StandardScaler().fit(v3_inputs(X, best))
        m = (v3_model(y, best) if best else new_model(y)).fit(sc.transform(v3_inputs(X, best)), y)
        r['roc_auc_on_training_rows'] = roc_auc_score(y, m.predict_proba(sc.transform(X))[:, 1])
        r['overfit_gap'] = r['roc_auc_on_training_rows'] - r['roc_auc']
    return {k: round(v, 3) for k, v in r.items()}


def mean_sd(runs):
    df = pd.DataFrame(runs)
    return {k: {'mean': round(df[k].mean(), 3), 'sd': round(df[k].std(), 3)} for k in df}


def main():
    df = load_dataset()
    X, y = feature_matrix(df, 'v3'), df.label.to_numpy()
    groups_fair = df['group']
    old = pd.read_csv(os.path.join(DATA_V3, 'landslides_v3_dataset.csv')).drop_duplicates('row_id').set_index('row_id')
    groups_old = df.row_id.map(old['group']).to_numpy()   # the original 0.5 degree cells

    print('A. Original v3 settings (200 trees, depth 6)')
    old_test = mean_sd([report(df, y, oof(X, y, groups_old, None, 5, s)) for s in OUTER_SEEDS])
    print('   old test (0.5 deg areas):  ROC-AUC', old_test['roc_auc'])
    base_runs = [report(df, y, oof(X, y, groups_fair, None, 5, s)) for s in OUTER_SEEDS]
    base = mean_sd(base_runs)
    base['overfit'] = report(df, y, oof(X, y, groups_fair, None, 5, 0), X, None)
    print('   fair test (1 deg areas):   ROC-AUC', base['roc_auc'])

    print('\nB. Nested tuning (fair test). This is the slow part...')
    tuned_runs, chosen = [], []
    for s in OUTER_SEEDS:
        p = np.zeros(len(y))
        folds = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=s).split(X, y, groups_fair)
        for k, (tr, te) in enumerate(folds):
            best, _ = search(X.iloc[tr].reset_index(drop=True), y[tr], groups_fair[tr], seed=100 * s + k)
            chosen.append(best)
            p[te] = fit_score(X.iloc[tr], y[tr], X.iloc[te], best)
        tuned_runs.append(report(df, y, p))
        print(f'   split {s}: ROC-AUC {tuned_runs[-1]["roc_auc"]}')
    tuned = mean_sd(tuned_runs)

    print('\nC. Final settings: same search on ALL rows (what gets installed)')
    final, inner_auc = search(X, y, groups_fair, seed=999)
    final_check = report(df, y, oof(X, y, groups_fair, final, 5, 0), X, final)
    print('   chosen:', json.dumps(final))

    print('\n' + '=' * 92)
    print(f'{"(unseen areas, mean of 3 splits)":40s}{"original v3":>16s}{"tuned v3":>16s}')
    for k in ['roc_auc', 'roc_auc_vs_nearby_same_day', 'roc_auc_vs_same_place_other_year',
              'false_alarm_at_70pct_recall', 'precision_at_70pct_recall', 'accuracy_at_70pct_recall']:
        print(f'{k:40s}{base[k]["mean"]:>9.3f} ±{base[k]["sd"]:.3f}{tuned[k]["mean"]:>9.3f} ±{tuned[k]["sd"]:.3f}')
    print(f'{"ROC-AUC on its own training rows":40s}{base["overfit"]["roc_auc_on_training_rows"]:>16.3f}'
          f'{final_check["roc_auc_on_training_rows"]:>16.3f}')
    print(f'{"overfit gap (training - unseen)":40s}{base["overfit"]["overfit_gap"]:>16.3f}{final_check["overfit_gap"]:>16.3f}')
    print('Settings chosen per outer fold (stability check):')
    print('  depth', [c['params']['max_depth'] for c in chosen], '| monotone',
          [c['monotone_rain'] for c in chosen].count(True), f'of {len(chosen)}',
          '| ignore_unstable', [c['ignore_unstable'] for c in chosen].count(True), f'of {len(chosen)}')

    better = bool(tuned['roc_auc']['mean'] > base['roc_auc']['mean'])
    result = {'original_old_test': old_test, 'original_fair_test': base, 'tuned_fair_test': tuned,
              'final': final, 'final_check': final_check, 'final_inner_auc': round(inner_auc, 3),
              'chosen_per_fold': chosen, 'tuned_is_better': better}
    with open(RESULTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
    if better:
        with open(BEST_JSON, 'w', encoding='utf-8') as f:
            json.dump(final, f, indent=2)
        print(f'\nTuned settings are better on unseen areas -> saved to {BEST_JSON}')
    else:
        print('\nTuning did NOT beat the original settings on unseen areas -> nothing saved')


if __name__ == '__main__':
    main()
