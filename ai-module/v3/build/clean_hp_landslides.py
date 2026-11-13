"""Cleans the Himachal landslide list (step 1 of the improvement plan).

Input : ai-module/data/raw/hp_landslides.csv        (kept unchanged)
Output: ai-module/data/v3/hp_landslides_clean.csv   (new file)
Report: ai-module/v3/results/hp_landslides_cleaning_report.json

Rules, applied in this order (each rule's drop count is written to the report):
  1. Trim spaces; treat '#N/A', '' and '0' in text/year columns as missing.
  2. Keep rows with a usable latitude and longitude (numbers).
  3. Keep rows inside a Himachal Pradesh box (lat 30.3-33.3, lon 75.5-79.0).
  4. Keep rows with a real year (1900-2026). Year '0' is a placeholder, not a date.
  5. Read a day only when history_date states one (e.g. '14th August 2023').
  6. Remove duplicates: same year and same coordinates rounded to 3 decimals (about 100 m).

Run from the repository root:
    py -3.11 ai-module/v3/build/clean_hp_landslides.py
"""
import json
import os
import re

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
V3 = os.path.dirname(HERE)
AI_DIR = os.path.dirname(V3)
IN_CSV = os.path.join(AI_DIR, 'data', 'raw', 'hp_landslides.csv')
OUT_CSV = os.path.join(AI_DIR, 'data', 'v3', 'hp_landslides_clean.csv')
REPORT = os.path.join(V3, 'results', 'hp_landslides_cleaning_report.json')

MISSING = {'', '#N/A', '0', 'nan', 'NaN'}
MONTHS = {m: i for i, m in enumerate(
    ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
     'november', 'december'], start=1)}
DAY_DATE = re.compile(r'(\d{1,2})(?:st|nd|rd|th)?\s*(?:[-–]\s*\d{1,2}(?:st|nd|rd|th)?\s*)?,?\s*'
                      r'(january|february|march|april|may|june|july|august|september|october|november|december)'
                      r'[,\s]+(\d{4})', re.IGNORECASE)


def read_day(text):
    """Return (year, month, day) if the text states a full day, else None."""
    m = DAY_DATE.search(text or '')
    if not m:
        return None
    return int(m.group(3)), MONTHS[m.group(2).lower()], int(m.group(1))


def main():
    raw = pd.read_csv(IN_CSV, dtype=str, keep_default_na=False)
    report = {'input_rows': len(raw)}
    d = raw.copy()
    for c in d.columns:
        d[c] = d[c].str.strip()
        d.loc[d[c].isin(MISSING) & (c in ('slide_name', 'district', 'material', 'movement', 'year')), c] = ''

    # 2. coordinates must be numbers
    d['lat_n'] = pd.to_numeric(d['lat'], errors='coerce')
    d['lon_n'] = pd.to_numeric(d['lon'], errors='coerce')
    ok = d['lat_n'].notna() & d['lon_n'].notna()
    report['dropped_bad_coordinates'] = int((~ok).sum())
    d = d[ok]

    # 3. inside Himachal box
    inside = d['lat_n'].between(30.3, 33.3) & d['lon_n'].between(75.5, 79.0)
    report['dropped_outside_himachal_box'] = int((~inside).sum())
    d = d[inside]

    # 4. real year
    d['year_n'] = pd.to_numeric(d['year'], errors='coerce')
    has_year = d['year_n'].between(1900, 2026)
    report['dropped_no_real_year'] = int((~has_year).sum())
    d = d[has_year].copy()
    d['year_n'] = d['year_n'].astype(int)

    # 5. full day only when the text states one
    days = d['history_date'].map(read_day)
    d['day_known'] = days.notna()
    report['rows_with_full_day'] = int(d['day_known'].sum())

    # 6. duplicates: same year and same place (3 decimals is about 100 m)
    d['lat_r'] = d['lat_n'].round(3)
    d['lon_r'] = d['lon_n'].round(3)
    before = len(d)
    d = d.drop_duplicates(['year_n', 'lat_r', 'lon_r'])
    report['dropped_duplicates'] = before - len(d)

    out = pd.DataFrame({
        'event_id': range(1, len(d) + 1),
        'year': d['year_n'].values,
        'day_known': d['day_known'].values,
        'lat': d['lat_n'].values,
        'lon': d['lon_n'].values,
        'name': d['slide_name'].values,
        'district': d['district'].values,
        'material': d['material'].values,
        'movement': d['movement'].values,
        'label': 1,
    })
    report['output_rows'] = len(out)
    report['years_range'] = [int(out['year'].min()), int(out['year'].max())] if len(out) else None
    report['rows_per_year_last_10'] = {int(k): int(v) for k, v in out['year'].value_counts().sort_index().tail(10).items()}
    report['before_2014'] = int((out['year'] < 2014).sum())
    report['2014_2016'] = int(out['year'].between(2014, 2016).sum())
    report['2017_on'] = int((out['year'] >= 2017).sum())
    report['rows_2015'] = int((out['year'] == 2015).sum())

    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    out.to_csv(OUT_CSV, index=False)
    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    with open(REPORT, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    print(json.dumps(report, indent=2))
    print('Saved:', OUT_CSV)


if __name__ == '__main__':
    main()
