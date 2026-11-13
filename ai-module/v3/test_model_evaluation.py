"""
Evaluate the TerraAlert V3 landslide model.

Checks:
  1. The saved model and scaler load and give sensible predictions.
  2. Metrics on the training data (accuracy, precision, recall, ROC-AUC).
  3. 5-fold spatial cross-validation (test areas are never seen in training).
  4. Overfitting check: training score vs cross-validation score.

Run:  py -3.11 -m pytest ai-module/v3/test_model_evaluation.py -v -s
"""
import os

import joblib
import numpy as np
import pytest
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler

from v3_common import FEATURES, HERE, feature_matrix, load_dataset, new_model

MODEL_PATH = os.path.join(HERE, 'xgboost_model_v3.pkl')
SCALER_PATH = os.path.join(HERE, 'scaler_v3.pkl')

MIN_CV_ROC_AUC = 0.55   # must beat random guessing (0.5) with some margin
MAX_OVERFIT_GAP = 0.50  # training AUC minus CV AUC; today it is about 0.41


def score_report(y_true, probs):
    preds = (probs >= 0.5).astype(int)
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
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    return model, scaler


@pytest.fixture(scope='module')
def train_scores(data, saved_model):
    df, X, y = data
    model, scaler = saved_model
    probs = model.predict_proba(scaler.transform(X))[:, 1]
    return score_report(y, probs)


@pytest.fixture(scope='module')
def cv_scores(data):
    df, X, y = data
    fold_aucs = []
    for train_idx, test_idx in GroupKFold(n_splits=5).split(X, y, groups=df['group']):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]
        scaler = StandardScaler().fit(X_train)
        model = new_model(y_train).fit(scaler.transform(X_train), y_train)
        probs = model.predict_proba(scaler.transform(X_test))[:, 1]
        fold_aucs.append(roc_auc_score(y_test, probs))
    return np.array(fold_aucs)


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
    print('\nTraining-data metrics:')
    for name, value in train_scores.items():
        print(f'  {name:9s} {value:.3f}')
    assert train_scores['roc_auc'] > 0.5


def test_cross_validation(cv_scores):
    print(f'\n5-fold spatial CV ROC-AUC per fold: {np.round(cv_scores, 3)}')
    print(f'Mean: {cv_scores.mean():.3f}  (+/- {cv_scores.std():.3f})')
    assert len(cv_scores) == 5
    assert cv_scores.mean() > MIN_CV_ROC_AUC


def test_overfitting(train_scores, cv_scores):
    gap = train_scores['roc_auc'] - cv_scores.mean()
    print(f'\nTraining ROC-AUC {train_scores["roc_auc"]:.3f} vs CV ROC-AUC {cv_scores.mean():.3f} -> gap {gap:.3f}')
    assert gap < MAX_OVERFIT_GAP
