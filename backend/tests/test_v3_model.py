"""
Safety tests for the tuned v3 model and the data guards around it (Nov 2026 changes).
Offline and fast: no Earth Engine, no database. Run:  py -3.11 -m pytest tests/test_v3_model.py -q

What each test protects, in plain words:
  - cut-offs map onto the app's 40 / 60 / 80 bands      -> levels mean what the app says they mean
  - plains rule                                         -> Delhi in the monsoon is never flagged from rain alone
  - more rain never lowers risk                         -> no "60 mm is safer than 40 mm" nonsense
  - warnings                                            -> backup rain / unusual inputs are flagged, normal ones are not
  - missing data is never "no rain" or "flat land"      -> an outage can't show up as LOW risk
  - v2 is unchanged                                     -> switching models back still works as before
"""
import json
import os
import sys

import pytest

BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, BACKEND)

from services.model_service import ModelService  # noqa: E402
from utils.data_processor import DataProcessor  # noqa: E402

MODELS = os.path.join(BACKEND, 'ml', 'models')
V3_DIR = os.path.join(MODELS, 'v3')
needs_v3 = pytest.mark.skipif(not os.path.exists(os.path.join(V3_DIR, 'model.pkl')),
                              reason='v3 model files are not in git - train with ai-module/v3/train_xgboost_v3.py')


def features(**overrides):
    """20 model inputs for a steep Himachal slope in a normal monsoon week, with overrides."""
    base = dict(elevation=2200, slope=30, aspect=180, ndvi=0.4, ndwi=0.0, soil_type=7,
                rainfall_3d=60, rainfall_7d=120, rainfall_14d=200, rainfall_30d=350)
    base.update(overrides)
    merged = {**base, **DataProcessor._engineer_features(base)}
    return [float(merged.get(name) or 0) for name in DataProcessor.FEATURE_ORDER]


@pytest.fixture(scope='module')
def v3():
    with open(os.path.join(V3_DIR, 'meta.json'), encoding='utf-8') as f:
        model = ModelService('v3', V3_DIR, json.load(f))
    model.load_models()
    return model


# ------------------------------------------------------------------ meta / cut-offs
@needs_v3
def test_v3_meta_has_safety_settings(v3):
    meta = v3.meta
    assert meta['plains_rule'] is True
    t = meta['risk_thresholds']
    assert 0 < t['MODERATE'] < t['HIGH'] < t['CRITICAL'] < 1
    assert meta['expected_rain_source_used'] == 'imerg_v07'
    assert 'rainfall_3d' in meta['feature_ranges']


@needs_v3
def test_cutoffs_land_on_app_bands(v3):
    t = v3.meta['risk_thresholds']
    assert v3.to_risk_index(0.0) == pytest.approx(0)
    assert v3.to_risk_index(t['MODERATE']) == pytest.approx(40)
    assert v3.to_risk_index(t['HIGH']) == pytest.approx(60)
    assert v3.to_risk_index(t['CRITICAL']) == pytest.approx(80)
    assert v3.to_risk_index(1.0) == pytest.approx(100)


@needs_v3
def test_level_matches_score(v3):
    for r3 in (0, 30, 60, 150, 300):
        p = v3.predict(features(rainfall_3d=r3, rainfall_7d=r3 * 1.5, rainfall_14d=r3 * 2, rainfall_30d=r3 * 3))
        assert 0 <= p['score'] <= 100
        assert p['level'] == v3._get_risk_level(p['score'])
        assert p['prediction_class'] == int(p['score'] >= 40)  # 1 = alert = Moderate or higher


# ------------------------------------------------------------------ physics and plains
@needs_v3
def test_more_rain_never_lowers_risk(v3):
    rows = [features(rainfall_3d=r, rainfall_7d=r * 1.5, rainfall_14d=r * 2, rainfall_30d=r * 3) for r in range(0, 401, 10)]
    scores = v3.predict_scores(rows)
    assert all(b >= a - 1e-9 for a, b in zip(scores, scores[1:])), scores


@needs_v3
def test_dry_is_lower_than_monsoon(v3):
    dry = v3.predict(features(rainfall_3d=0, rainfall_7d=2, rainfall_14d=10, rainfall_30d=40))
    wet = v3.predict(features())
    assert dry['score'] < wet['score']
    assert dry['level'] == 'LOW'


@needs_v3
def test_plains_rule_keeps_flat_land_low(v3):
    p = v3.predict(features(elevation=216, slope=2, rainfall_3d=200, rainfall_30d=700))
    assert (p['score'], p['level'], p['model_type']) == (5.0, 'LOW', 'Rule-Based (Plains)')
    assert v3.predict_scores([features(elevation=216, slope=2, rainfall_3d=200)]) == [5.0]


# ------------------------------------------------------------------ low-confidence warnings
@needs_v3
def test_no_warning_for_normal_inputs(v3):
    p = v3.predict(features(), {'rain_source_used': 'imerg_v07'})
    assert p['low_confidence'] is False and p['warnings'] == []


@needs_v3
def test_backup_rain_source_is_flagged(v3):
    p = v3.predict(features(), {'rain_source_used': 'open-meteo'})
    assert p['low_confidence'] is True
    assert any(w.startswith('rain_source_mismatch') for w in p['warnings'])


@needs_v3
def test_rain_beyond_training_is_flagged(v3):
    p = v3.predict(features(rainfall_3d=900, rainfall_7d=1000, rainfall_14d=1100, rainfall_30d=1500))
    assert p['low_confidence'] is True
    assert any(w.startswith('outside_training_range:rainfall_3d') for w in p['warnings'])


# ------------------------------------------------------------------ v2 untouched
def test_v2_score_is_plain_probability():
    v2 = ModelService('v2', MODELS, {'plains_rule': True})  # no risk_thresholds -> old behaviour
    assert v2.to_risk_index(0.37) == pytest.approx(37)
    assert v2.data_warnings(features()) == []


# ------------------------------------------------------------------ missing data guards (GEE service)
class _FakeGeometry:
    def buffer(self, _):
        return self


@pytest.fixture
def gee(monkeypatch, tmp_path):
    import services.gee_service as gs
    monkeypatch.setattr(gs.ee.Geometry, 'Point', lambda *_a, **_k: _FakeGeometry())
    monkeypatch.setattr(gs, 'RAIN_SOURCE_LOG', str(tmp_path / 'rain_log.jsonl'))
    service = object.__new__(gs.GEEService)  # skip ee.Initialize()
    ok_terrain = {'elevation_mean': 2000, 'slope_mean': 30, 'aspect_mean': 180}
    monkeypatch.setattr(service, '_get_terrain_features', lambda region: ok_terrain)
    monkeypatch.setattr(service, '_get_vegetation_modis_sr', lambda *a: {'ndvi': 0.4, 'ndwi': 0.0})
    monkeypatch.setattr(service, '_get_soil_features', lambda region: {'soil_type_class': 7})
    return service, tmp_path


def test_no_rain_data_is_not_zero_rain(gee, monkeypatch):
    service, _ = gee
    monkeypatch.setattr(service, '_get_rainfall_imerg', lambda *a: {
        **{f'rainfall_{d}d': 0 for d in (3, 7, 14, 30)}, 'rain_source_used': 'unavailable', 'rain_data_age_days': None})
    assert service.get_all_features(31.1, 77.2, '2026-10-01', '2026-10-31', rain_source='imerg', veg_source='modis_sr') is None


def test_no_terrain_data_is_not_flat_land(gee, monkeypatch):
    service, _ = gee
    monkeypatch.setattr(service, '_get_rainfall_imerg', lambda *a: {
        **{f'rainfall_{d}d': 10 for d in (3, 7, 14, 30)}, 'rain_source_used': 'imerg_v07', 'rain_data_age_days': 1})
    monkeypatch.setattr(service, '_get_terrain_features', lambda region: None)
    assert service.get_all_features(31.1, 77.2, '2026-10-01', '2026-10-31', rain_source='imerg', veg_source='modis_sr') is None


def test_rain_source_is_logged(gee, monkeypatch):
    service, tmp_path = gee
    monkeypatch.setattr(service, '_get_rainfall_imerg', lambda *a: {
        **{f'rainfall_{d}d': 10 for d in (3, 7, 14, 30)}, 'rain_source_used': 'imerg_v07', 'rain_data_age_days': 1})
    result = service.get_all_features(31.1, 77.2, '2026-10-01', '2026-10-31', rain_source='imerg', veg_source='modis_sr')
    assert result['rain_source_used'] == 'imerg_v07' and result['elevation'] == 2000
    entry = json.loads((tmp_path / 'rain_log.jsonl').read_text(encoding='utf-8').strip())
    assert entry['used'] == 'imerg_v07' and entry['requested'] == 'imerg'


def test_training_rain_source_is_tried_first():
    import services.gee_service as gs
    assert gs.IMERG_COLLECTIONS[0].endswith('IMERG_V07')
