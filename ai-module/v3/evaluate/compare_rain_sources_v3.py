"""
Does live rain match the rain v3 was trained on?

v3 learned from NASA IMERG V07. Live predictions use V07 too, but fall back to IMERG V08 (once it exists) and then
to Open-Meteo when IMERG is more than 3 days behind (backend/services/gee_service.py). If a backup reports rain
on a different scale, the model gets numbers it never learned from. This script measures that.

  1. Live log      - how often each source was really used (backend/logs/rain_source_log.jsonl)
  2. History       - for training rows, fetch the same rain windows from Open-Meteo (and V08 if it exists)
                     and compare with the stored V07 values
  3. Recent days   - Open-Meteo for recent dates comes from its *forecast* API (a different product than its
                     archive), which is exactly what the live fallback uses. Compare it with V07 too.
  4. Impact        - re-score the history rows with each backup source's rain: how often does the risk level change?

Writes ai-module/v3/results/rain_source_comparison_v3.json

Run:  py -3.11 ai-module/v3/evaluate/compare_rain_sources_v3.py            (all steps, ~10 min)
      py -3.11 ai-module/v3/evaluate/compare_rain_sources_v3.py --log-only (step 1 only, instant)
"""
import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # v3/ holds v3_common.py
from v3_common import RESULTS_DIR, ROOT, feature_matrix, load_dataset

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(ROOT, 'backend', '.env'))
import ee  # noqa: E402
from services.gee_service import GEEService, RAIN_SOURCE_LOG, RAIN_WINDOWS  # noqa: E402
from services.model_service import ModelService  # noqa: E402

V3_DIR = os.path.join(ROOT, 'backend', 'ml', 'models', 'v3')
OUT_JSON = os.path.join(RESULTS_DIR, 'rain_source_comparison_v3.json')
WINDOWS = [f'rainfall_{d}d' for d in RAIN_WINDOWS]


# ---------------------------------------------------------------- 1. live log
def summarise_live_log():
    if not os.path.exists(RAIN_SOURCE_LOG):
        print('1. Live log: no entries yet (the backend writes them on every live prediction)\n')
        return None
    log = pd.read_json(RAIN_SOURCE_LOG, lines=True)
    # Only real live calls: the window ends on the day of the call (dataset builds fetch old dates)
    log = log[(pd.to_datetime(log['time']) - pd.to_datetime(log['end_date'])).dt.days.abs() <= 2]
    if log.empty:
        print('1. Live log: no live entries yet\n')
        return None
    share = (log['used'].value_counts(normalize=True) * 100).round(1).to_dict()
    print(f'1. Live log: {len(log)} live fetches; % by source used: {share}\n')
    return {'live_fetches': len(log), 'percent_by_source': share}


# ---------------------------------------------------------------- 2./3. fetching
def fetch_backups(gee, rows, with_v08):
    """Open-Meteo (and V08) rain for each row's location and date. Same functions the live app calls."""
    out = []
    for i, r in enumerate(rows.itertuples(), 1):
        rec = {'row_id': r.row_id}
        om = gee._get_rainfall_open_meteo(r.lat, r.lon, r.end_date)
        rec.update({f'om_{w}': om.get(w) for w in WINDOWS} if om['rain_source_used'] == 'open-meteo' else {})
        if with_v08:
            region = ee.Geometry.Point([r.lon, r.lat]).buffer(1000)
            rec.update({f'v08_{w}': v for w, v in GEEService.imerg_totals('NASA/GPM_L3/IMERG_V08', region, r.end_date).items()})
        out.append(rec)
        if i % 20 == 0:
            print(f'   fetched {i}/{len(rows)}')
        time.sleep(0.2)  # be polite to the free Open-Meteo API
    return pd.DataFrame(out)


def compare(ref, other, label):
    """How closely `other` rain follows reference (V07) rain, per window."""
    res = {}
    for w in WINDOWS:
        a, b = ref[w].to_numpy(float), other[w].to_numpy(float)
        ok = ~np.isnan(a) & ~np.isnan(b)
        a, b = a[ok], b[ok]
        res[w] = {
            'n': int(ok.sum()),
            # Same ranking? 1 = wettest places/days in the same order in both sources
            'spearman': round(float(spearmanr(a, b)[0]), 3),
            # Same scale? 1.0 = same total rain; 0.6 = backup reports 40% less
            'total_ratio': round(float(b.sum() / max(a.sum(), 1e-9)), 3),
            'median_abs_diff_mm': round(float(np.median(np.abs(a - b))), 1),
        }
    print(f'   {label}:')
    for w, m in res.items():
        print(f'     {w:13s} n={m["n"]:3d}  ranking agreement={m["spearman"]:.2f}  '
              f'backup/V07 total={m["total_ratio"]:.2f}  typical difference={m["median_abs_diff_mm"]} mm')
    return res


# ---------------------------------------------------------------- 4. impact on the app
def impact(model, sample, backup, prefix, label):
    """Score the same rows with V07 rain and with backup rain; count risk-level changes."""
    swapped = sample.copy()
    cols = {f'{prefix}_{w}': w for w in WINDOWS}
    b = backup.set_index('row_id').loc[sample.row_id, list(cols)].rename(columns=cols).reset_index(drop=True)
    keep = b.notna().all(axis=1).to_numpy()
    swapped.loc[keep, WINDOWS] = b[keep].to_numpy()
    s_ref = np.array(model.predict_scores(feature_matrix(sample[keep], 'v3').values.tolist()))
    s_new = np.array(model.predict_scores(feature_matrix(swapped[keep], 'v3').values.tolist()))
    lvl = np.vectorize(model._get_risk_level)
    alert = lambda s: s >= model.LEVEL_STARTS['MODERATE']
    res = {
        'n': int(keep.sum()),
        'level_changed_pct': round(100 * float((lvl(s_ref) != lvl(s_new)).mean()), 1),
        'alert_flipped_pct': round(100 * float((alert(s_ref) != alert(s_new)).mean()), 1),
        'mean_index_shift': round(float((s_new - s_ref).mean()), 1),
    }
    print(f'   {label}: risk level changes for {res["level_changed_pct"]}% of rows, '
          f'alert on/off flips for {res["alert_flipped_pct"]}%, average score shift {res["mean_index_shift"]:+}')
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--log-only', action='store_true')
    ap.add_argument('--n', type=int, default=150, help='training rows to compare')
    args = ap.parse_args()

    result = {'generated_at': datetime.now().isoformat(timespec='seconds'), 'live_log': summarise_live_log()}
    if args.log_only:
        return

    gee = GEEService(project_id=os.getenv('GEE_PROJECT_ID'))
    with_v08 = gee._latest_image_time('NASA/GPM_L3/IMERG_V08') is not None
    print(f'IMERG V08 in Earth Engine: {"yes" if with_v08 else "not yet - only Open-Meteo is compared"}\n')

    # ---- 2. history: training rows (the stored rain IS V07 - see build_dataset_v3.py)
    df = load_dataset()
    sample = df.groupby('kind', group_keys=False).apply(
        lambda g: g.sample(min(len(g), args.n // 3), random_state=42)).reset_index(drop=True)
    sample['end_date'] = sample['date'].astype(str).str[:10]
    print(f'2. History: {len(sample)} training rows (2006-2017), Open-Meteo archive vs stored V07')
    hist = fetch_backups(gee, sample, with_v08)
    merged = sample.merge(hist, on='row_id')
    result['history'] = {'open_meteo_archive': compare(merged[WINDOWS], merged[[f'om_{w}' for w in WINDOWS]]
                                                       .set_axis(WINDOWS, axis=1), 'Open-Meteo archive vs V07')}
    if with_v08:
        result['history']['imerg_v08'] = compare(merged[WINDOWS], merged[[f'v08_{w}' for w in WINDOWS]]
                                                 .set_axis(WINDOWS, axis=1), 'IMERG V08 vs V07')

    # ---- 3. recent: what the live fallback really returns (Open-Meteo forecast API) vs fresh V07
    sites = df[df.kind == 'landslide'].drop_duplicates(['lat', 'lon']).sample(20, random_state=1)
    latest_v07 = gee._latest_image_time('NASA/GPM_L3/IMERG_V07')
    ends = [(latest_v07 - timedelta(days=k)).strftime('%Y-%m-%d') for k in (1, 25, 50)]
    recent = sites.loc[sites.index.repeat(len(ends)), ['lat', 'lon']].reset_index(drop=True)
    recent['end_date'] = ends * len(sites)
    recent['row_id'] = range(len(recent))
    print(f'\n3. Recent: {len(recent)} location-days ending {", ".join(ends)}, Open-Meteo forecast API vs V07')
    v07 = [GEEService.imerg_totals('NASA/GPM_L3/IMERG_V07', ee.Geometry.Point([r.lon, r.lat]).buffer(1000), r.end_date)
           for r in recent.itertuples()]
    recent[WINDOWS] = pd.DataFrame(v07)[WINDOWS]
    rec = recent.merge(fetch_backups(gee, recent, False), on='row_id')
    result['recent'] = {'open_meteo_forecast_api': compare(rec[WINDOWS], rec[[f'om_{w}' for w in WINDOWS]]
                                                           .set_axis(WINDOWS, axis=1), 'Open-Meteo (live fallback) vs V07')}

    # ---- 4. impact on what the user sees
    print('\n4. Impact on v3 risk levels (history rows, everything else unchanged)')
    with open(os.path.join(V3_DIR, 'meta.json'), encoding='utf-8') as f:
        model = ModelService('v3', V3_DIR, json.load(f))
    model.load_models()
    result['impact'] = {'open_meteo_archive': impact(model, sample, hist, 'om', 'Open-Meteo instead of V07')}
    if with_v08:
        result['impact']['imerg_v08'] = impact(model, sample, hist, 'v08', 'V08 instead of V07')

    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, default=str)
    print(f'\nwritten to {OUT_JSON}')


if __name__ == '__main__':
    main()
