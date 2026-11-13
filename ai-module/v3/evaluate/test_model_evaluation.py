"""
Pass/fail checks for the installed TerraAlert v3 landslide model (the tuned one).

Checks:
  1. The data has the right shape and the saved model + scaler give valid 0-1 outputs.
  2. Metrics on the training data (accuracy, precision, recall, ROC-AUC) at the app's alert level.
  3. 5-fold spatial cross-validation with the SAME settings as the installed model (unseen ~100 km areas).
  4. No overfitting: training score and unseen-area score stay close.
  5. The alert level still catches about 70% of landslides on unseen areas.

For graphs, confusion matrices and a paper-style report, run research_evaluation_v3.py instead.

Run:  py -3.11 -m pytest ai-module/v3/evaluate/test_model_evaluation.py -v -s
"""
import json
import os
import sys

import joblib
import numpy as np
import pytest
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # v3/ holds v3_common.py
from v3_common import FEATURES, MODELS_DIR, RESULTS_DIR, feature_matrix, load_best, load_dataset, v3_inputs, v3_model

MODEL_PATH = os.path.join(MODELS_DIR, 'xgboost_model_v3.pkl')
SCALER_PATH = os.path.join(MODELS_DIR, 'scaler_v3.pkl')
THRESHOLDS_PATH = os.path.join(RESULTS_DIR, 'risk_thresholds_v3.json')

MIN_CV_ROC_AUC = 0.58    # must clearly beat random guessing (0.5); tuned v3 scores ~0.61
MAX_OVERFIT_GAP = 0.15   # training AUC minus unseen-area AUC; tuned v3 ~0.07 (the untuned model was 0.43)
TARGET_RECALL = 0.70     # the MODERATE level was chosen to catch 70% of landslides


def score_report(y_true, probs, cutoff):
    """Grade the model when it raises an alert for every output >= cutoff."""
    preds = (probs >= cutoff).astype(int)
    return {
        'accuracy': accuracy_score(y_true, preds),
        'precision': precision_score(y_true, preds, zero_division=0),
        'recall': recall_score(y_true, preds, zero_division=0),
        'roc_auc': roc_auc_score(y_true, probs),
    }


@pytest.fixture(scope='module')
def data():
    df = load_dataset()
    X = feature_matrix(df, 'v3')
    y = df['label'].to_numpy()
    return df, X, y


@pytest.fixture(scope='module')
def saved_model():
    return joblib.load(MODEL_PATH), joblib.load(SCALER_PATH)


@pytest.fixture(scope='module')
def alert_cutoff():
    """The model output where the app's MODERATE level (first alert level) starts."""
    with open(THRESHOLDS_PATH, encoding='utf-8') as f:
        return json.load(f)['thresholds']['MODERATE']


@pytest.fixture(scope='module')
def train_scores(data, saved_model, alert_cutoff):
    df, X, y = data
    model, scaler = saved_model
    probs = model.predict_proba(scaler.transform(X))[:, 1]
    return score_report(y, probs, alert_cutoff)


@pytest.fixture(scope='module')
def cv_results(data, alert_cutoff):
    """Out-of-fold scores: every row scored by a model that never saw its ~100 km block."""
    df, X, y = data
    best = load_best()                       # the tuned settings the installed model uses
    probs = np.zeros(len(y))
    fold_aucs = []
    folds = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=0)
    for train_idx, test_idx in folds.split(X, y, groups=df['group']):
        X_train, X_test = v3_inputs(X.iloc[train_idx], best), X.iloc[test_idx]
        scaler = StandardScaler().fit(X_train)
        model = v3_model(y[train_idx], best).fit(scaler.transform(X_train), y[train_idx])
        probs[test_idx] = model.predict_proba(scaler.transform(X_test))[:, 1]
        fold_aucs.append(roc_auc_score(y[test_idx], probs[test_idx]))
    return np.array(fold_aucs), score_report(y, probs, alert_cutoff)


def test_dataset_shape(data):
    df, X, y = data
    print(f'\nRows: {X.shape[0]}, features: {X.shape[1]}, landslide share: {y.mean():.1%}')
    assert X.shape[1] == len(FEATURES) == 20
    assert set(np.unique(y)) == {0, 1}


def test_predictions_are_probabilities(data, saved_model):
    df, X, y = data
    model, scaler = saved_model
    probs = model.predict_proba(scaler.transform(X))[:, 1]
    assert len(probs) == len(y)
    assert np.all((probs >= 0) & (probs <= 1))


def test_training_metrics(train_scores):
    print('\nTraining-data metrics at the alert level:')
    for name, value in train_scores.items():
        print(f'  {name:9s} {value:.3f}')
    assert train_scores['roc_auc'] > 0.5


def test_cross_validation(cv_results):
    fold_aucs, _ = cv_results
    print(f'\n5-fold spatial CV ROC-AUC per fold: {np.round(fold_aucs, 3)}')
    print(f'Mean: {fold_aucs.mean():.3f}  (+/- {fold_aucs.std():.3f})')
    assert len(fold_aucs) == 5
    assert fold_aucs.mean() > MIN_CV_ROC_AUC


def test_overfitting(train_scores, cv_results):
    fold_aucs, _ = cv_results
    gap = train_scores['roc_auc'] - fold_aucs.mean()
    print(f'\nTraining ROC-AUC {train_scores["roc_auc"]:.3f} vs CV ROC-AUC {fold_aucs.mean():.3f} -> gap {gap:.3f}')
    assert gap < MAX_OVERFIT_GAP


def test_alert_level_catches_target_share(cv_results):
    _, unseen = cv_results
    print(f'\nUnseen areas at the alert level: recall {unseen["recall"]:.0%}, precision {unseen["precision"]:.0%}, '
          f'accuracy {unseen["accuracy"]:.0%}')
    assert unseen['recall'] == pytest.approx(TARGET_RECALL, abs=0.02)
