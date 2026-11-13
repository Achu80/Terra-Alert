"""Adds the NEW landslide events (not in the old 555) to the v3 training data.

Reads  : ai-module/data/v3/landslides_combined_events.csv   (730 events: old 555 + new 175)
Writes : ai-module/data/v3/v3_new_rows.csv                  (plan: location + date for every new row)
         ai-module/data/v3/landslides_v3_new_part.csv       (features fetched with the app's own GEE code)

The controls use the same rules as build_dataset_v3.py (spatial control 5-30 km, same elevation +-300 m,
>= 1 km from any catalogued landslide; temporal control = same spot, same day, other year, no slide within
5 km / 15 days). Exclusion checks use all 730 events, so a control never sits next to any known slide.

Resumable: rows already in the output file are skipped.
Run from the repository root:
    py -3.11 ai-module/v3/build/build_new_events_v3.py
"""
import math
import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_dataset_v3 as b  # noqa: E402  (same feature code and control rules as the v3 builder)

ROOT = b.ROOT
DATA_V3 = b.DATA_V3
COMBINED = os.path.join(DATA_V3, 'landslides_combined_events.csv')
NEW_PLAN = os.path.join(DATA_V3, 'v3_new_rows.csv')
NEW_PART = os.path.join(DATA_V3, 'landslides_v3_new_part.csv')
OLD_IDS = set(pd.read_csv(os.path.join(b.DATA_RAW, 'landslide_north_india.csv')).event_id)


def plan_new_rows():
    if os.path.exists(NEW_PLAN):
        return pd.read_csv(NEW_PLAN)
    allev = pd.read_csv(COMBINED)
    allev['date'] = pd.to_datetime(allev['date'])
    new = allev[~allev.event_id.isin(OLD_IDS)].reset_index(drop=True)
    lats, lons = allev.latitude.to_numpy(), allev.longitude.to_numpy()
    rng = np.random.default_rng(b.SEED)

    cands = []
    for i, e in new.iterrows():
        for k in range(b.CANDIDATES_PER_EVENT):
            km = rng.uniform(b.SPATIAL_MIN_KM, b.SPATIAL_MAX_KM)
            lat, lon = b.offset_point(e.latitude, e.longitude, km, rng.uniform(0, 360))
            cands.append((f'c{i}_{k}', lat, lon))
    b.log(f'Sampling elevations for {len(new)} new events and {len(cands)} candidates...')
    elev = b.sample_elevations([(f'e{i}', e.latitude, e.longitude) for i, e in new.iterrows()] + cands)

    rows = []
    for i, e in new.iterrows():
        group = f'{math.floor(e.latitude / 0.5)}_{math.floor(e.longitude / 0.5)}'
        common = {'event_id': e.event_id, 'region': e.source, 'group': group}
        date = e.date.strftime('%Y-%m-%d')
        rows.append({**common, 'kind': 'landslide', 'label': 1, 'lat': e.latitude, 'lon': e.longitude, 'date': date})

        e_elev = elev.get(f'e{i}')
        for k in range(b.CANDIDATES_PER_EVENT):
            pid, lat, lon = cands[i * b.CANDIDATES_PER_EVENT + k]
            c_elev = elev.get(pid)
            if e_elev is None or c_elev is None or c_elev <= 0 or abs(c_elev - e_elev) > b.ELEV_TOLERANCE_M:
                continue
            if b.haversine_km(lat, lon, lats, lons).min() < b.MIN_KM_FROM_LANDSLIDE:
                continue
            rows.append({**common, 'kind': 'spatial_control', 'label': 0, 'lat': lat, 'lon': lon, 'date': date})
            break

        near = b.haversine_km(e.latitude, e.longitude, lats, lons) <= b.TEMPORAL_EXCLUDE_KM
        for years in (-1, 1, -2, 2):
            try:
                d = e.date.replace(year=e.date.year + years)
            except ValueError:  # 29 Feb
                d = e.date.replace(year=e.date.year + years, day=28)
            if d.year < 2001 or d > datetime(2025, 12, 31):
                continue
            if (abs((allev.date[near] - d).dt.days) <= b.TEMPORAL_EXCLUDE_DAYS).any():
                continue
            rows.append({**common, 'kind': 'temporal_control', 'label': 0, 'lat': e.latitude, 'lon': e.longitude,
                         'date': d.strftime('%Y-%m-%d')})
            break

    plan = pd.DataFrame(rows)
    plan.insert(0, 'row_id', range(900000, 900000 + len(plan)))  # ids separate from the old plan
    plan.to_csv(NEW_PLAN, index=False)
    b.log(f'Planned new rows: {plan.kind.value_counts().to_dict()}')
    return plan


def main():
    from dotenv import load_dotenv  # noqa: F401  (already loaded by build_dataset_v3)
    from services.gee_service import GEEService

    gee = GEEService(project_id=os.getenv('GEE_PROJECT_ID'))
    plan = plan_new_rows()
    done = set()
    if os.path.exists(NEW_PART) and os.path.getsize(NEW_PART) > 0:
        done = set(pd.read_csv(NEW_PART, usecols=['row_id']).row_id)
    todo = [r for r in plan.to_dict('records') if r['row_id'] not in done]
    b.log(f'new rows: {len(plan)}, already fetched: {len(done)}, to go: {len(todo)}')

    fields = ['row_id', 'event_id', 'kind', 'label', 'region', 'group', 'lat', 'lon', 'date'] + b.BASE + \
        ['rain_source_used'] + b.V2_EXTRA
    new_file = not os.path.exists(NEW_PART) or os.path.getsize(NEW_PART) == 0
    import csv
    sys.stdout = open(os.devnull, 'w', encoding='utf-8')  # the GEE service prints a lot
    with open(NEW_PART, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        if new_file:
            writer.writeheader()
        failed = 0
        for n, row in enumerate(todo, 1):
            try:
                result = b.fetch_row(gee, row)
            except Exception as e:  # keep going; failed rows are reported
                result = None
                b.log(f"row {row['row_id']} failed: {e}")
            if result is None:
                failed += 1
            else:
                writer.writerow(result)
                f.flush()
            if n % 20 == 0 or n == len(todo):
                b.log(f'progress {n}/{len(todo)} (failed {failed})')
    b.log('done')


if __name__ == '__main__':
    main()
