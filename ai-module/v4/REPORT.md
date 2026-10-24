# Landslide model v4 vs v3

Generated 2026-10-23T07:08:15 by `ai-module/v4/train_xgboost_v4.py`.
Same 1,610 rows and same 20 live inputs as v3. Unseen-area numbers are averaged over 5 shuffled
5-fold splits grouped by 0.5 degree cell, so they differ slightly from v3/REPORT.md (one fixed split).

| Check | v3 | v4 |
|---|---|---|
| Unseen areas ROC-AUC (higher = better) | 0.577 | 0.608 |
| Unseen areas Brier (lower = better) | 0.257 | 0.237 |
| Rain response: landslide vs same place other year, ROC-AUC | 0.618 | 0.652 |
| Himachal held out ROC-AUC | 0.611 | 0.631 |
| Rows where 30% more rain LOWERED the score (should be 0) | 0.363 | 0.0 |
| Average day-to-day score jump in a 30-day forecast (lower = steadier) | 10.5 | 2.6 |

## What changed
- **More rain never lowers the score** (monotone constraints on the 3/7/14/30-day rain inputs and heavy-rain flags).
- **Shallower, regularised trees** (depth 3, 400 trees at learning rate 0.03, row/column subsampling).
- **Rain-ratio inputs unused** - they explode when recent rain is near zero and made forecasts jump.

## Still true
ROC-AUC around 0.6 means the model ranks risk better than chance but is far from reliable on its own.
Forecast days far ahead also inherit the uncertainty of the rain forecast itself.
