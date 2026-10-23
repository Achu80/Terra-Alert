"""
Grade v2 and v3 on the same rows, in ways that expose shortcuts. Writes metrics_v3.json and REPORT.md.

  1. Spatial cross-validation: 5 folds grouped by 0.5 degree cell of the source event, so a landslide and
     its controls are always in the same fold and test areas are unseen during training.
  2. Leave-one-region-out: train on Kashmir + Uttarakhand (+ others), test on Himachal Pradesh.
  3. Two diagnostic splits of the test rows:
       - landslide vs spatial control  (same day, nearby, similar elevation) -> can it tell WHERE?
       - landslide vs temporal control (same place, other year)             -> does it respond to RAIN?
  v2 is the original model, unchanged, given its own recipe (CHIRPS rain, Sentinel-2/MODIS vegetation).
  Note: v2 was trained on these same 555 landslide points, which favours v2 on the landslide rows.

Run: py -3.11 ai-module/v3/evaluate_v2_vs_v3.py
"""
import json
import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import accuracy_score, average_precision_score, brier_score_loss, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler

from v3_common import FEATURES, HERE, ROOT, feature_matrix, load_dataset, new_model, plains_mask

V2_MODEL = os.path.join(ROOT, 'ai-module', 'xgboost_model_v2.pkl')
V2_SCALER = os.path.join(ROOT, 'ai-module', 'scaler_v2.pkl')


def v2_scores(X2):
    """v2 exactly as deployed: its scaler + model, then the backend's plains rule (score 5)."""
    model, scaler = joblib.load(V2_MODEL), joblib.load(V2_SCALER)
    p = model.predict_proba(scaler.transform(X2[list(scaler.feature_names_in_)]))[:, 1]
    p[plains_mask(X2).to_numpy()] = 0.05
    return p


def metrics(y, p):
    y, p = np.asarray(y), np.asarray(p)
    pred = (p >= 0.5).astype(int)
    return {
        'roc_auc': round(float(roc_auc_score(y, p)), 3) if len(set(y)) > 1 else None,
        'pr_auc': round(float(average_precision_score(y, p)), 3) if len(set(y)) > 1 else None,
        'accuracy': round(float(accuracy_score(y, pred)), 3),
        'precision': round(float(precision_score(y, pred, zero_division=0)), 3),
        'recall': round(float(recall_score(y, pred, zero_division=0)), 3),
        'brier': round(float(brier_score_loss(y, p)), 3),
        'n': int(len(y)),
    }


def split_metrics(df, p):
    """Overall + the two diagnostic comparisons."""
    out = {'all': metrics(df.label, p)}
    for kind in ('spatial_control', 'temporal_control'):
        m = df.kind.isin(['landslide', kind]).to_numpy()
        out[f'vs_{kind}'] = metrics(df.label[m], p[m])
    return out


def fit_predict(X_train, y_train, X_test):
    scaler = StandardScaler().fit(X_train)
    model = new_model(y_train).fit(scaler.transform(X_train), y_train)
    return model.predict_proba(scaler.transform(X_test))[:, 1]


def shap_importance(model, scaler, X):
    contribs = model.get_booster().predict(xgb.DMatrix(scaler.transform(X)), pred_contribs=True)[:, :-1]
    imp = np.abs(contribs).mean(axis=0)
    return {f: round(float(v), 3) for f, v in sorted(zip(FEATURES, imp), key=lambda t: -t[1])}


def write_report(r):
    """Plain-language comparison for the team (ai-module/v3/REPORT.md)."""
    def table(section):
        lines = ['| Test | Model | ROC-AUC | Accuracy | Precision | Recall | Brier (lower=better) |', '|---|---|---|---|---|---|---|']
        names = {'all': 'All test rows', 'vs_spatial_control': 'Landslide vs nearby same-day place',
                 'vs_temporal_control': 'Landslide vs same place, other year'}
        for key, label in names.items():
            for model in ('v2', 'v3'):
                m = r[section][model][key]
                lines.append(f"| {label} | {model} | {m['roc_auc']} | {m['accuracy']} | {m['precision']} | {m['recall']} | {m['brier']} |")
        return '\n'.join(lines)

    top = lambda model: ', '.join(f'{k} ({v})' for k, v in list(r['shap_mean_abs'][model].items())[:5])
    med = r['median_score_by_kind']
    text = f"""# Landslide model v3 vs v2

Generated {r['generated_at']} by `ai-module/v3/evaluate_v2_vs_v3.py`. Rows: {r['rows']}.

**How to read this:** ROC-AUC 0.5 = guessing, 1.0 = perfect. "Nearby same-day place" tests whether a model
can tell *where* a landslide happens without relying on altitude/region shortcuts; "same place, other year"
tests whether it reacts to *rain* (the trigger). v2 was trained on these same 555 landslide points, which
favours v2 on landslide rows, so v2's numbers here are optimistic.

## Unseen areas (5-fold spatial cross-validation)
{table('spatial_cv')}

## Himachal Pradesh held out (trained only on other states)
{table('himachal_holdout')}

## Median risk score (0-100) by row type
| Model | Landslides | Nearby same-day places | Same place, other year |
|---|---|---|---|
| v2 | {med['v2'].get('landslide')} | {med['v2'].get('spatial_control')} | {med['v2'].get('temporal_control')} |
| v3 | {med['v3'].get('landslide')} | {med['v3'].get('spatial_control')} | {med['v3'].get('temporal_control')} |

A good model scores landslides high and both kinds of safe rows low.

## What each model relies on most (mean |SHAP|)
- v2: {top('v2')}
- v3: {top('v3')}

## Plains rule (elevation < 800 m and slope < 15 deg)
{r['plains_rows']}

## Recommendation
Switch to v3 only if it beats v2 on the "unseen areas" and "Himachal held out" tables, especially the
"same place, other year" rows. Switching is done in the app: admin mode -> Settings -> Prediction model.
"""
    with open(os.path.join(HERE, 'REPORT.md'), 'w', encoding='utf-8') as f:
        f.write(text)
    print('REPORT.md written')


def main():
    df = load_dataset()
    X3, X2, y = feature_matrix(df, 'v3'), feature_matrix(df, 'v2'), df.label.to_numpy()
    print(f'rows: {len(df)} | {df.kind.value_counts().to_dict()}')

    p_v2 = v2_scores(X2)

    # 1. Spatial CV for v3 (out-of-fold scores)
    p_v3_cv = np.zeros(len(df))
    for train_idx, test_idx in GroupKFold(n_splits=5).split(X3, y, groups=df['group']):
        p_v3_cv[test_idx] = fit_predict(X3.iloc[train_idx], y[train_idx], X3.iloc[test_idx])

    # 2. Leave Himachal out
    hp = (df.region == 'Himachal Pradesh').to_numpy()
    p_v3_hp = fit_predict(X3[~hp], y[~hp], X3[hp])
    df_hp = df[hp].reset_index(drop=True)

    # Plains rule check for v3: how does v3 score the rows the rule would override?
    pm = plains_mask(X3).to_numpy()

    # Explainability on a model trained on everything
    scaler = StandardScaler().fit(X3)
    full = new_model(y).fit(scaler.transform(X3), y)
    v2_model, v2_scaler = joblib.load(V2_MODEL), joblib.load(V2_SCALER)

    results = {
        'generated_at': datetime.now().isoformat(timespec='seconds'),
        'rows': df.kind.value_counts().to_dict(),
        'spatial_cv': {'v2': split_metrics(df, p_v2), 'v3': split_metrics(df, p_v3_cv)},
        'himachal_holdout': {'v2': split_metrics(df_hp, p_v2[hp]), 'v3': split_metrics(df_hp, p_v3_hp)},
        'plains_rows': {
            'count': int(pm.sum()),
            'landslides_among_them': int(y[pm].sum()),
            'v3_mean_score_controls': round(float(p_v3_cv[pm & (y == 0)].mean() * 100), 1) if (pm & (y == 0)).any() else None,
            'v3_mean_score_landslides': round(float(p_v3_cv[pm & (y == 1)].mean() * 100), 1) if (pm & (y == 1)).any() else None,
        },
        'shap_mean_abs': {
            'v2': shap_importance(v2_model, v2_scaler, X2[list(v2_scaler.feature_names_in_)]),
            'v3': shap_importance(full, scaler, X3),
        },
        'median_score_by_kind': {
            name: {k: round(float(np.median(p[df.kind == k]) * 100), 1) for k in df.kind.unique()}
            for name, p in (('v2', p_v2), ('v3', p_v3_cv))
        },
    }
    with open(os.path.join(HERE, 'metrics_v3.json'), 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    write_report(results)
    print(json.dumps({k: results[k] for k in ('spatial_cv', 'himachal_holdout', 'median_score_by_kind', 'plains_rows')}, indent=1))
    print('top SHAP v2:', list(results['shap_mean_abs']['v2'].items())[:5])
    print('top SHAP v3:', list(results['shap_mean_abs']['v3'].items())[:5])


if __name__ == '__main__':
    main()
