# Landslide model v3 vs v2

Generated 2026-10-23T05:03:06 by `ai-module/v3/evaluate_v2_vs_v3.py`. Rows: {'landslide': 552, 'temporal_control': 552, 'spatial_control': 506}.

**How to read this:** ROC-AUC 0.5 = guessing, 1.0 = perfect. "Nearby same-day place" tests whether a model
can tell *where* a landslide happens without relying on altitude/region shortcuts; "same place, other year"
tests whether it reacts to *rain* (the trigger). v2 was trained on these same 555 landslide points, which
favours v2 on landslide rows, so v2's numbers here are optimistic.

## Unseen areas (5-fold spatial cross-validation)
| Test | Model | ROC-AUC | Accuracy | Precision | Recall | Brier (lower=better) |
|---|---|---|---|---|---|---|
| All test rows | v2 | 0.489 | 0.475 | 0.331 | 0.52 | 0.406 |
| All test rows | v3 | 0.59 | 0.619 | 0.42 | 0.292 | 0.249 |
| Landslide vs nearby same-day place | v2 | 0.541 | 0.525 | 0.547 | 0.52 | 0.362 |
| Landslide vs nearby same-day place | v3 | 0.54 | 0.502 | 0.542 | 0.292 | 0.319 |
| Landslide vs same place, other year | v2 | 0.442 | 0.449 | 0.456 | 0.52 | 0.424 |
| Landslide vs same place, other year | v3 | 0.635 | 0.568 | 0.652 | 0.292 | 0.284 |

## Himachal Pradesh held out (trained only on other states)
| Test | Model | ROC-AUC | Accuracy | Precision | Recall | Brier (lower=better) |
|---|---|---|---|---|---|---|
| All test rows | v2 | 0.48 | 0.474 | 0.325 | 0.497 | 0.392 |
| All test rows | v3 | 0.611 | 0.644 | 0.474 | 0.353 | 0.249 |
| Landslide vs nearby same-day place | v2 | 0.56 | 0.531 | 0.555 | 0.497 | 0.333 |
| Landslide vs nearby same-day place | v3 | 0.559 | 0.541 | 0.6 | 0.353 | 0.315 |
| Landslide vs same place, other year | v2 | 0.407 | 0.431 | 0.439 | 0.497 | 0.423 |
| Landslide vs same place, other year | v3 | 0.658 | 0.598 | 0.692 | 0.353 | 0.278 |

## Median risk score (0-100) by row type
| Model | Landslides | Nearby same-day places | Same place, other year |
|---|---|---|---|
| v2 | 56.2 | 45.8 | 73.2 |
| v3 | 34.4 | 29.1 | 20.8 |

A good model scores landslides high and both kinds of safe rows low.

## What each model relies on most (mean |SHAP|)
- v2: ndwi (2.156), elevation (1.622), rainfall_ratio_7d_14d (0.704), ndvi (0.701), slope_elevation_product (0.682)
- v3: rainfall_3d (0.358), ndvi (0.297), rainfall_ratio_14d_30d (0.289), rainfall_ratio_3d_7d (0.259), ndwi (0.254)

## Plains rule (elevation < 800 m and slope < 15 deg)
{'count': 142, 'landslides_among_them': 46, 'v3_mean_score_controls': 28.9, 'v3_mean_score_landslides': 29.6}

## Recommendation
Switch to v3 only if it beats v2 on the "unseen areas" and "Himachal held out" tables, especially the
"same place, other year" rows. Switching is done in the app: admin mode -> Settings -> Prediction model.
