"""
All landslide models the backend knows about, and which one is active.

Layout (backend/ml/models/):
    xgboost_model.pkl + scaler.pkl   -> v2, the original model (loaded from here when there is no v2/ folder)
    v3/model.pkl + scaler.pkl + meta.json
    <any other version>/...          -> picked up automatically if it has a meta.json

The active version is stored in backend/ml/active_model.json. Missing or unknown -> v2.
Every prediction should use `registry.active()` and feed it rain from `model.rain_source`.
"""
import json
import os
import threading

from services.model_service import ModelService

ML_DIR = os.path.join(os.path.dirname(__file__), '..', 'ml')
MODELS_DIR = os.path.join(ML_DIR, 'models')
ACTIVE_FILE = os.path.join(ML_DIR, 'active_model.json')
DEFAULT_VERSION = 'v2'

# v2 was built before meta.json existed, so its description lives here
V2_META = {
    'label': 'v2 (original)',
    'description': 'Original XGBoost model (ai-module/train_xgboost_v2.py), trained with CHIRPS rainfall.',
    'rain_source': 'chirps',
    'veg_source': 'sentinel2',
    'plains_rule': True,
    'metrics': {'accuracy_random_split': 0.904, 'roc_auc_random_split': 0.963},
}


def _read_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


class ModelRegistry:
    def __init__(self):
        self._lock = threading.Lock()
        self._models = {}
        self._active = DEFAULT_VERSION
        self.reload()

    def reload(self):
        """(Re)load every model found on disk and the saved active version."""
        models = {}

        # v2: versioned folder if present, otherwise the original flat files
        v2_dir = os.path.join(MODELS_DIR, 'v2')
        v2_meta = {**V2_META, **(_read_json(os.path.join(v2_dir, 'meta.json')) or {})}
        v2 = ModelService('v2', v2_dir if os.path.isdir(v2_dir) else MODELS_DIR, v2_meta)
        v2.load_models()
        if v2.model_loaded:
            models['v2'] = v2

        # Any other folder with a meta.json is another model version (e.g. v3)
        if os.path.isdir(MODELS_DIR):
            for name in sorted(os.listdir(MODELS_DIR)):
                folder = os.path.join(MODELS_DIR, name)
                meta = _read_json(os.path.join(folder, 'meta.json'))
                if name == 'v2' or not os.path.isdir(folder) or not meta:
                    continue
                service = ModelService(name, folder, meta)
                service.load_models()
                if service.model_loaded:
                    models[name] = service

        saved = (_read_json(ACTIVE_FILE) or {}).get('version', DEFAULT_VERSION)
        with self._lock:
            self._models = models
            self._active = saved if saved in models else DEFAULT_VERSION
        print(f"✓ Models available: {', '.join(models) or 'none'} | active: {self._active}")

    def active(self) -> ModelService:
        """The model every prediction should use. Falls back to v2, then to an unloaded v2 (mock)."""
        with self._lock:
            return self._models.get(self._active) or self._models.get(DEFAULT_VERSION) or ModelService('v2', MODELS_DIR, V2_META)

    def get(self, version):
        with self._lock:
            return self._models.get(version)

    def list(self):
        with self._lock:
            return [
                {
                    'version': v,
                    'label': m.label,
                    'description': m.meta.get('description', ''),
                    'rain_source': m.rain_source,
                    'veg_source': m.veg_source,
                    'metrics': m.meta.get('metrics', {}),
                    'trained_at': m.meta.get('trained_at'),
                    'active': v == self._active,
                }
                for v, m in self._models.items()
            ]

    def set_active(self, version):
        """Make `version` the model for everyone. Clears cached scores made by the previous model."""
        with self._lock:
            if version not in self._models:
                raise ValueError(f"Unknown model version '{version}'")
            self._active = version
        with open(ACTIVE_FILE, 'w', encoding='utf-8') as f:
            json.dump({'version': version}, f)

        # Cached district scores / predictions came from the old model
        from database.cache_repository import DistrictCache, PredictionCache
        DistrictCache().clear()
        PredictionCache().clear()
        print(f"✓ Active model is now {version}")
        return version


# One shared registry for the whole backend
registry = ModelRegistry()
