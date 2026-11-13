"""
Time-based test for the installed TerraAlert v3 model (step 3 of the improvement plan).

The model is trained only on events from BEFORE 2014 and tested on events from 2014-2016.
This checks whether it still works on later years, not just on new areas (the spatial test).

Each landslide and its controls share one event, so the whole event goes into one period.
Nothing from the test years is used for training.

Run from the repository root:
    py -3.11 ai-module/v3/evaluate/time_split_test_v3.py
"""
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, confusion_matrix, precision_score,
                             recall_score, roc_auc_score)
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # v3/ holds v3_common.py
from v3_common import MODELS_DIR, RESULTS_DIR, feature_matrix, load_best, load_dataset, v3_inputs, v3_model  # noqa: E402

SPLIT_YEAR = 2014
OUT_JSON = os.path.join(RESULTS_DIR, 'time_split_v3.json')


def main():
    df = load_dataset()
    X = feature_matrix(df, 'v3')
    y = df['label'].to_numpy()
    best = load_best()

    # Year of each EVENT (taken from its landslide row), copied to every row of that event
    event_year = (pd.to_datetime(df.loc[df.kind == 'landslide'].set_index('event_id')['date']).dt.year)
    row_year = df['event_id'].map(event_year).to_numpy()
    train = row_year < SPLIT_YEAR
    test = ~train

    # Train on the earlier years only (same settings as the installed model)
    X_train = v3_inputs(X[train], best)
    scaler = StandardScaler().fit(X_train)
    model = v3_model(y[train], best).fit(scaler.transform(X_train), y[train])
    probs = model.predict_proba(scaler.transform(X[test]))[:, 1]
    y_test = y[test]

    # The alert level chosen earlier (not re-chosen on the test years)
    with open(os.path.join(RESULTS_DIR, 'risk_thresholds_v3.json'), encoding='utf-8') as f:
        cutoff = json.load(f)['thresholds']['MODERATE']
    preds = (probs >= cutoff).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_test, preds).ravel()

    result = {
        'split_year': SPLIT_YEAR,
        'train_rows': int(train.sum()), 'test_rows': int(test.sum()),
        'train_landslides': int(y[train].sum()), 'test_landslides': int(y_test.sum()),
        'alert_cutoff': cutoff,
        'roc_auc': roc_auc_score(y_test, probs),
        'accuracy': accuracy_score(y_test, preds),
        'balanced_accuracy': balanced_accuracy_score(y_test, preds),
        'recall': recall_score(y_test, preds, zero_division=0),
        'precision': precision_score(y_test, preds, zero_division=0),
        'false_alarm_rate': fp / (fp + tn) if (fp + tn) else float('nan'),
        'true_positives': int(tp), 'false_negatives': int(fn),
        'false_positives': int(fp), 'true_negatives': int(tn),
    }

    # Compare with the spatial out-of-fold score for context
    spatial = os.path.join(RESULTS_DIR, 'accuracy_table_v3.csv')
    if os.path.exists(spatial):
        result['spatial_test_roc_auc_for_comparison'] = float(pd.read_csv(spatial)['roc_auc'][0])

    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, default=lambda o: o.item() if hasattr(o, 'item') else str(o))

    print(f"\nTime-based test: train before {SPLIT_YEAR} ({result['train_landslides']} landslides), "
          f"test {SPLIT_YEAR}-2016 ({result['test_landslides']} landslides)")
    for k in ['roc_auc', 'accuracy', 'balanced_accuracy', 'recall', 'precision', 'false_alarm_rate']:
        print(f"  {k:18s} {result[k]:.3f}")
    print(f"  alerts: {result['true_positives']} caught, {result['false_negatives']} missed, "
          f"{result['false_positives']} false alarms, {result['true_negatives']} correct safe")
    print(f"Saved: {OUT_JSON}")


if __name__ == '__main__':
    main()
