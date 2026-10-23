"""
Build the v3 training dataset (case-control design) with the backend's own feature pipeline.

For every catalogued landslide (ai-module/landslide_north_india.csv):
  1. landslide row        - the event location on the event date               (label 1)
  2. spatial control      - same date, 5-30 km away, elevation within +-300 m,
                            >= 1 km from any catalogued landslide               (label 0)
  3. temporal control     - same location, same calendar day one year earlier/later,
                            with no catalogued landslide within 5 km / +-15 days  (label 0)

Each row's features are fetched with backend/services/gee_service.py - the code the live app uses:
  - v3 recipe: rain 'imerg' + vegetation 'modis_sr'
  - v2 recipe: rain 'chirps' + vegetation 'sentinel2' (stored separately so v2 can be graded fairly)
Rain windows end on the row's date (exclusive), exactly like a live prediction made that morning.

Resumable: rows already in the output CSV are skipped. Run from the repo root:
    py -3.11 ai-module/v3/build_dataset_v3.py
"""
import csv
import math
import os
import sys
import time
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
BACKEND = os.path.join(ROOT, 'backend')
sys.path.insert(0, BACKEND)

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(BACKEND, '.env'))
import ee  # noqa: E402
from services.gee_service import GEEService  # noqa: E402

EVENTS_CSV = os.path.join(ROOT, 'ai-module', 'landslide_north_india.csv')
CONTROLS_CSV = os.path.join(HERE, 'v3_rows.csv')          # all rows to fetch (positives + controls)

SEED = 42
RETRIES = 4
SPATIAL_MIN_KM, SPATIAL_MAX_KM = 5, 30
ELEV_TOLERANCE_M = 300
MIN_KM_FROM_LANDSLIDE = 1.0
TEMPORAL_EXCLUDE_KM, TEMPORAL_EXCLUDE_DAYS = 5, 15
CANDIDATES_PER_EVENT = 16
BUFFER_M = 1000

BASE = ['elevation', 'slope', 'aspect', 'ndvi', 'ndwi', 'soil_type',
        'rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d']
V2_EXTRA = ['ndvi_v2', 'ndwi_v2', 'rainfall_3d_v2', 'rainfall_7d_v2', 'rainfall_14d_v2', 'rainfall_30d_v2']


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 6371 * 2 * np.arcsin(np.sqrt(a))


def offset_point(lat, lon, km, bearing_deg):
    b = math.radians(bearing_deg)
    dlat = km * math.cos(b) / 111.0
    dlon = km * math.sin(b) / (111.0 * math.cos(math.radians(lat)))
    return lat + dlat, lon + dlon


def sample_elevations(points):
    """SRTM elevation for [(id, lat, lon)] in batches (one Earth Engine call per batch)."""
    dem = ee.Image('USGS/SRTMGL1_003').rename('elev')
    out = {}
    for i in range(0, len(points), 2000):
        batch = points[i:i + 2000]
        fc = ee.FeatureCollection([ee.Feature(ee.Geometry.Point([lon, lat]), {'pid': pid}) for pid, lat, lon in batch])
        res = dem.sampleRegions(collection=fc, scale=30, geometries=False).getInfo()
        for f in res['features']:
            out[f['properties']['pid']] = f['properties'].get('elev')
        log(f'  elevations sampled: {min(i + 2000, len(points))}/{len(points)}')
    return out


def plan_rows():
    """Decide every row (location + date) to fetch. Cached in v3_rows.csv."""
    if os.path.exists(CONTROLS_CSV):
        return pd.read_csv(CONTROLS_CSV)

    ev = pd.read_csv(EVENTS_CSV).drop_duplicates(['latitude', 'longitude', 'event_date']).reset_index(drop=True)
    ev['date'] = pd.to_datetime(ev['event_date'])
    rng = np.random.default_rng(SEED)
    lats, lons = ev.latitude.to_numpy(), ev.longitude.to_numpy()

    # Candidate points for spatial controls
    cands = []
    for i, e in ev.iterrows():
        for k in range(CANDIDATES_PER_EVENT):
            km = rng.uniform(SPATIAL_MIN_KM, SPATIAL_MAX_KM)
            lat, lon = offset_point(e.latitude, e.longitude, km, rng.uniform(0, 360))
            cands.append((f'c{i}_{k}', lat, lon))
    log(f'Sampling elevations for {len(ev)} events and {len(cands)} candidates...')
    elev = sample_elevations([(f'e{i}', e.latitude, e.longitude) for i, e in ev.iterrows()] + cands)

    rows = []
    for i, e in ev.iterrows():
        group = f'{math.floor(e.latitude / 0.5)}_{math.floor(e.longitude / 0.5)}'  # 0.5 deg cell of the event
        common = {'event_id': e.event_id, 'region': e.admin_division_name, 'group': group}
        date = e.date.strftime('%Y-%m-%d')
        rows.append({**common, 'kind': 'landslide', 'label': 1, 'lat': e.latitude, 'lon': e.longitude, 'date': date})

        # Spatial control: same date, similar elevation, away from every catalogued landslide
        e_elev = elev.get(f'e{i}')
        for k in range(CANDIDATES_PER_EVENT):
            pid, lat, lon = cands[i * CANDIDATES_PER_EVENT + k]
            c_elev = elev.get(pid)
            if e_elev is None or c_elev is None or c_elev <= 0 or abs(c_elev - e_elev) > ELEV_TOLERANCE_M:
                continue
            if haversine_km(lat, lon, lats, lons).min() < MIN_KM_FROM_LANDSLIDE:
                continue
            rows.append({**common, 'kind': 'spatial_control', 'label': 0, 'lat': lat, 'lon': lon, 'date': date})
            break

        # Temporal control: same place, same calendar day in another year, no catalogued slide nearby
        near = haversine_km(e.latitude, e.longitude, lats, lons) <= TEMPORAL_EXCLUDE_KM
        for years in (-1, 1, -2, 2):
            try:
                d = e.date.replace(year=e.date.year + years)
            except ValueError:  # 29 Feb
                d = e.date.replace(year=e.date.year + years, day=28)
            if d.year < 2001 or d > datetime(2025, 12, 31):
                continue
            if (abs((ev.date[near] - d).dt.days) <= TEMPORAL_EXCLUDE_DAYS).any():
                continue
            rows.append({**common, 'kind': 'temporal_control', 'label': 0, 'lat': e.latitude, 'lon': e.longitude,
                         'date': d.strftime('%Y-%m-%d')})
            break

    plan = pd.DataFrame(rows)
    plan.insert(0, 'row_id', range(len(plan)))
    plan.to_csv(CONTROLS_CSV, index=False)
    log(f'Planned rows: {plan.kind.value_counts().to_dict()}')
    return plan


def fetch_row(gee, row):
    end = row['date']
    start = (datetime.strptime(end, '%Y-%m-%d') - timedelta(days=30)).strftime('%Y-%m-%d')
    # get_all_features returns None when Earth Engine refuses a request (e.g. rate limit) - back off and retry
    v3 = None
    for attempt in range(RETRIES):
        v3 = gee.get_all_features(row['lat'], row['lon'], start, end, BUFFER_M, rain_source='imerg', veg_source='modis_sr')
        if v3:
            break
        time.sleep(2 ** (attempt + 1))
    if not v3:
        return None
    region = ee.Geometry.Point([row['lon'], row['lat']]).buffer(BUFFER_M)
    rain_v2 = gee._get_rainfall_features(region, start, end)
    veg_v2 = gee._get_vegetation_features(region, start, end)
    out = {k: row[k] for k in ('row_id', 'event_id', 'kind', 'label', 'region', 'group', 'lat', 'lon', 'date')}
    out.update({k: v3.get(k, 0) or 0 for k in BASE})
    out['rain_source_used'] = v3.get('rain_source_used')
    out.update({'ndvi_v2': veg_v2.get('ndvi', 0) or 0, 'ndwi_v2': veg_v2.get('ndwi', 0) or 0})
    out.update({f'rainfall_{d}d_v2': rain_v2.get(f'rainfall_{d}d', 0) or 0 for d in (3, 7, 14, 30)})
    return out


def part_files():
    return sorted(f for f in os.listdir(HERE) if f.startswith('landslides_v3_part') and f.endswith('.csv'))


def main():
    # Parallelism = several independent processes, each with its own shard of rows:
    #   py -3.11 ai-module/v3/build_dataset_v3.py --shard 0 --shards 4   (and 1, 2, 3)
    # Running without --shard fetches every row that no part file has yet (use it for a final pass).
    args = sys.argv[1:]
    shard = int(args[args.index('--shard') + 1]) if '--shard' in args else None
    shards = int(args[args.index('--shards') + 1]) if '--shards' in args else 1

    gee = GEEService(project_id=os.getenv('GEE_PROJECT_ID'))
    plan = plan_rows()
    # The service prints a lot of per-call debug output (with emoji). utf-8 matters: with Windows'
    # default cp1252 every emoji print raised UnicodeEncodeError inside get_all_features -> every row failed.
    sys.stdout = open(os.devnull, 'w', encoding='utf-8')

    done = set()
    for name in part_files():
        try:
            done |= set(pd.read_csv(os.path.join(HERE, name), usecols=['row_id']).row_id)
        except (ValueError, pd.errors.EmptyDataError):
            pass
    todo = [r for r in plan.to_dict('records')
            if r['row_id'] not in done and (shard is None or r['row_id'] % shards == shard)]
    out_csv = os.path.join(HERE, f"landslides_v3_part{'_rest' if shard is None else shard}.csv")
    log(f'shard {shard}: {len(done)} rows already fetched overall, {len(todo)} to go -> {os.path.basename(out_csv)}')

    fields = ['row_id', 'event_id', 'kind', 'label', 'region', 'group', 'lat', 'lon', 'date'] + BASE + ['rain_source_used'] + V2_EXTRA
    new_file = not os.path.exists(out_csv) or os.path.getsize(out_csv) == 0
    with open(out_csv, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        if new_file:
            writer.writeheader()
            f.flush()
        failed = 0
        for n, row in enumerate(todo, 1):
            try:
                result = fetch_row(gee, row)
            except Exception as e:
                result = None
                log(f"row {row['row_id']} failed: {e}")
            if result is None:
                failed += 1
            else:
                writer.writerow(result)
                f.flush()
            if n % 10 == 0 or n == len(todo):
                log(f'shard {shard} progress {n}/{len(todo)} (failed {failed})')
    log(f'shard {shard} done')


if __name__ == '__main__':
    main()
