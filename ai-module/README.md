# AI module

Everything used to train, evaluate and compare the landslide models. The live app only uses the files that are copied into `backend/ml/models/`.

## Folders

| Folder | What is in it |
|---|---|
| `data/raw/` | Landslide event list and constrained non-landslide points (inputs for v2 and v3) |
| `data/v2/` | Combined and engineered tables used by v2 |
| `data/v3/` | v3 dataset shards (`landslides_v3_part*.csv`), merged `landslides_v3_dataset.csv`, control rows |
| `v2/` | Original model scripts; `models/` and `charts/` hold its files. Kept for comparison only |
| `v3/` | Live model (see below) |
| `v4/` | Steadier-forecast variant of v3 |
| `v5/` | Terrain experiment. Not used by the app and not committed |
| `tools/` | Forecast API helper scripts |

## The live model (v3)

| Folder | What is in it |
|---|---|
| `v3/v3_common.py` | Shared paths, features, and the tuned model settings. Every v3 script imports it |
| `v3/build/` | `build_dataset_v3.py` - fetches satellite inputs for every row |
| `v3/train/` | `tune_v3.py` (picks settings), `calibrate_thresholds_v3.py` (picks the alert cut-offs), `train_xgboost_v3.py` (trains and installs into the backend) |
| `v3/evaluate/` | `test_model_evaluation.py` (pass/fail tests), `research_evaluation_v3.py` (full report), `evaluate_v3_like_v2.py` (ROC, confusion matrix, accuracy table), `compare_rain_sources_v3.py`, `evaluate_v2_vs_v3.py`, `simple_evaluation.py` |
| `v3/results/` | Cut-offs, tuned settings, metrics, charts, `evaluation_report/` |
| `v3/models/` | Trained `.pkl` files (not committed; rebuild with `train/`) |
| `v3/docs/` | Status and before/after PDFs |
| `v3/logs/` | Build, tuning and pipeline logs |
| `v3/archive/` | Superseded reports and the model from before tuning |
| `v3/run_after_build.ps1` | Runs the whole pipeline in order and stops at the first failing step |

## Run order (from the repository root)

```bash
py -3.11 ai-module/v3/build/build_dataset_v3.py          # slow: satellite queries
py -3.11 ai-module/v3/train/tune_v3.py                   # ~15 min
py -3.11 ai-module/v3/train/train_xgboost_v3.py          # trains, installs, picks cut-offs
py -3.11 -m pytest ai-module/v3/evaluate/test_model_evaluation.py -v -s
py -3.11 ai-module/v3/evaluate/evaluate_v3_like_v2.py    # ROC, confusion matrix, accuracy table
py -3.11 ai-module/v3/evaluate/research_evaluation_v3.py # full report (~5 min)
```

Restart the backend after training so it loads the new model.
