# Link Your Existing Model to Backend

## Quick Start (3 Steps)

### Step 1: Link Your Model Folder

```bash
cd backend
python ml/link_model.py /path/to/your/model/folder
```

This will copy your model files to `backend/ml/models/`

### Step 2: Analyze Your Model

```bash
python ml/analyze_model.py ml/models/your_model.pkl
```

This will show you:
- ✓ Number of features required
- ✓ Feature names (if available)
- ✓ Feature importances
- ✓ Suggested GEE data sources

### Step 3: Update GEE Service

Based on the analysis, update `services/gee_service.py` to fetch the exact features your model needs.

---

## Detailed Instructions

### What You Need

1. **Your trained model file** (.pkl, .pickle, .h5, .pt, etc.)
2. **Feature names** (if not in model, you need to know the order)
3. **Feature preprocessing** (normalization, scaling, etc.)

### Option A: Your Model Has Feature Names

If your model was trained with pandas DataFrame:

```python
# During training
X_train = pd.DataFrame(...)  # With column names
model.fit(X_train, y_train)

# Model will have feature_names_in_
```

**Steps:**

1. Link model:
   ```bash
   python ml/link_model.py /path/to/your/model
   ```

2. Analyze:
   ```bash
   python ml/analyze_model.py ml/models/your_model.pkl
   ```

3. You'll see output like:
   ```
   ✓ Feature names found:
     1. rainfall_24h
     2. slope_angle
     3. ndvi
     4. elevation
     ...
   ```

4. Update `services/gee_service.py` to fetch these exact features

5. Update `utils/data_processor.py`:
   ```python
   FEATURE_ORDER = [
       'rainfall_24h',
       'slope_angle',
       'ndvi',
       'elevation',
       # ... your features
   ]
   ```

### Option B: Your Model Doesn't Have Feature Names

If you trained with numpy arrays:

```python
# During training
X_train = np.array(...)  # No column names
model.fit(X_train, y_train)
```

**You MUST know the exact order of features used during training!**

**Steps:**

1. Find your training script
2. Note the exact order of features
3. Create a file `ml/models/feature_names.txt`:
   ```
   rainfall_24h
   slope_angle
   ndvi
   elevation
   ...
   ```

4. Update GEE service to fetch in this EXACT order

### Common Feature Mappings

| Your Feature Name | GEE Data Source | How to Fetch |
|-------------------|-----------------|--------------|
| rainfall_24h | CHIRPS | `get_rainfall_features()` |
| rainfall_7d | CHIRPS | `get_rainfall_features()` |
| elevation | SRTM | `get_terrain_features()` |
| slope | SRTM | `get_terrain_features()` |
| aspect | SRTM | `get_terrain_features()` |
| ndvi | Sentinel-2 | `get_vegetation_features()` |
| ndwi | Sentinel-2 | `get_vegetation_features()` |
| population | WorldPop | `get_population_features()` |
| soil_type | OpenLandMap | `get_soil_features()` |
| temperature | ERA5 | Need to add |
| humidity | ERA5 | Need to add |

### Example: Updating GEE Service

If your model needs these features:
```
1. rainfall_1d
2. rainfall_7d
3. slope_mean
4. ndvi
5. population_density
```

Update `services/gee_service.py`:

```python
def get_all_features(self, lat, lon, start_date, end_date, buffer=1000):
    """Fetch features required by YOUR model"""
    
    point = ee.Geometry.Point([lon, lat])
    region = point.buffer(buffer)
    
    features = {}
    
    # 1. Rainfall
    rainfall = self._get_rainfall_features(region, start_date, end_date)
    features['rainfall_1d'] = rainfall['rainfall_1d']
    features['rainfall_7d'] = rainfall['rainfall_7d']
    
    # 2. Terrain
    terrain = self._get_terrain_features(region)
    features['slope_mean'] = terrain['slope_mean']
    
    # 3. Vegetation
    vegetation = self._get_vegetation_features(region, start_date, end_date)
    features['ndvi'] = vegetation['ndvi']
    
    # 4. Population
    population = self._get_population_features(region)
    features['population_density'] = population['population_density']
    
    return features
```

Update `utils/data_processor.py`:

```python
FEATURE_ORDER = [
    'rainfall_1d',
    'rainfall_7d',
    'slope_mean',
    'ndvi',
    'population_density'
]
```

### Testing Your Integration

```bash
# Test 1: Check model loads
python -c "from services.model_service import ModelService; m = ModelService(); m.load_models()"

# Test 2: Full integration test
python tests/test_ai_integration.py

# Test 3: API test
python app.py
# In another terminal:
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"lat": 19.0760, "lon": 72.8777}'
```

### Troubleshooting

**Error: "Model expects X features but got Y"**
- Your FEATURE_ORDER doesn't match model training
- Check feature names with analyze_model.py
- Ensure exact same order as training

**Error: "Feature 'xyz' not found in GEE data"**
- GEE service not fetching that feature
- Add fetching logic for that feature
- Check feature name spelling

**Error: "Model file not found"**
- Model not in `backend/ml/models/` folder
- Run link_model.py again
- Check file permissions

**Predictions seem wrong**
- Check feature normalization
- Ensure same preprocessing as training
- Verify feature order matches training

### Feature Preprocessing

If your model was trained with normalized features:

```python
# In data_processor.py
def normalize_features(features):
    # Use SAME normalization as training!
    
    # If you used StandardScaler during training:
    # mean = [10.5, 25.3, ...]  # From training
    # std = [5.2, 8.1, ...]      # From training
    # normalized = (features - mean) / std
    
    # If you used MinMaxScaler:
    # min_vals = [0, 0, ...]     # From training
    # max_vals = [100, 50, ...]  # From training
    # normalized = (features - min_vals) / (max_vals - min_vals)
    
    return normalized
```

### Multiple Models (Ensemble)

If you have multiple models:

```bash
# Link all models
python ml/link_model.py /path/to/models

# Should have:
# ml/models/rf.pkl
# ml/models/adaboost.pkl
# ml/models/bagging.pkl
```

The `ModelService` will automatically load all and create ensemble.

### Next Steps After Linking

1. ✓ Link model folder
2. ✓ Analyze model requirements
3. ✓ Update GEE service
4. ✓ Update data processor
5. ✓ Test integration
6. → Build frontend
7. → Deploy

## Need Help?

Run the analyzer and share the output:

```bash
python ml/analyze_model.py ml/models/your_model.pkl > model_analysis.txt
```

This will show exactly what your model needs!
