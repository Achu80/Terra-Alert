# Terra Alert: Landslide Risk Warnings for Himachal Pradesh

Terra Alert estimates **landslide risk** for any location in Himachal Pradesh from recent rainfall, terrain, vegetation and soil data, all fetched live from satellites. It shows the result on a web dashboard and an Android app, with a district map, a 30-day risk outlook, alerts and an AI assistant.

> **Terra Alert gives risk warnings, not predictions.**
> "High landslide risk in Shimla today because of heavy rain. Stay alert." ✅
> "A landslide will happen in Shimla today." ❌
> At the alert level the model catches about **7 in 10** past landslides, but **many alerts do not end in a landslide**. Always follow official advisories (HPSDMA, IMD, district administration).

---

## Contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Reading a risk score](#reading-a-risk-score)
- [The model](#the-model)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Retraining the model](#retraining-the-model)
- [API](#api)
- [Known limits](#known-limits)
- [Further reading](#further-reading)

---

## What it does

| Feature | Web | Android |
|---|:-:|:-:|
| Risk check for any location (search or tap the map) | ✅ | ✅ |
| District map of Himachal Pradesh with current risk | ✅ | ✅ |
| 30-day risk outlook from the rainfall forecast | ✅ | ✅ |
| Plain-language warning with what to do at each level | ✅ | ✅ |
| "Low confidence" badge when the data is unusual or from a backup source | – | ✅ |
| History and trends of past checks | ✅ | ✅ |
| AI assistant (Google Gemini) that knows the current risk | ✅ | ✅ |
| Alerts for Moderate risk and above (SMS via Twilio, optional) | ✅ | ✅ |
| Admin: switch model (v2 / v3 / v4), set risk thresholds | – | ✅ |

## How it works

```
 Location ──► Backend (Flask) ──► Google Earth Engine ──► 20 model inputs ──► XGBoost model ──► Risk score 0-100
                                   • rain: NASA IMERG                                          + level
                                   • terrain: SRTM                                             + warning sentence
                                   • vegetation: MODIS                                         + low-confidence flag
                                   • soil: OpenLandMap
                                                                   │
                                     Supabase (history, alerts, cache) ◄─┘──► Web dashboard / Android app
```

1. You pick a place. The backend fetches **rain for the last 3, 7, 14 and 30 days**, plus **slope, elevation, vegetation and soil** for a 1 km area around it.
2. The data is turned into the **20 inputs** the model was trained on, using the same code for training and for live checks.
3. The **XGBoost model** gives a risk score. Flat, low-lying ground (below 800 m, slope under 15°) is always Low, because the model was not trained there.
4. The score, level and any warnings are saved to **Supabase** and shown in the apps.

**Safety rules built into the backend:**
- If rain or terrain data is missing, the place shows as **UNKNOWN**. It is never shown as a "safe" 0 mm or 0 m.
- Every check records which rain source it used. If rain came from a backup source, or an input is outside what the model learned from, the result is marked **low confidence**.

## Reading a risk score

| Score | Level | What it means | What to do |
|---|---|---|---|
| 0–39 | **Low** | Normal conditions | Keep an eye on the weather |
| 40–59 | **Moderate** | Landslides are possible; alerts start here | Stay alert: watch for cracks, seepage, tilting trees |
| 60–79 | **High** | Conditions favour landslides | Be ready to move; avoid hill roads and stream banks |
| 80–100 | **Critical** | Very high risk | Move away from slopes, follow official orders. Help: 112 / 1077 / 1070 |

The score is a **risk scale, not a percentage chance**. The level boundaries were chosen on purpose (see below), so a score of 40 means "alert level", not "40% chance".

## The model

The live model is **v3**: XGBoost with 20 inputs (rain over 4 windows, elevation, slope, aspect, vegetation, moisture, soil and engineered rain/terrain signals).

**Training data.** 552 recorded landslides in Himachal Pradesh, Uttarakhand and Kashmir (2007–2016). Each one is compared with:
- a **nearby slope on the same day** (5–30 km away, similar height), and
- the **same spot on the same date in a normal year**.

This forces the model to learn from rain and terrain, not from "hills vs plains".

**How it was tuned (November 2026).**
- Nested spatial cross-validation picked a small model that cannot memorise its training rows.
- **More rain can never lower the risk.** This rule is built into the model.
- Five unstable inputs are ignored.

**Honest performance.** These numbers are measured on ~100 km areas the model never saw during training:

| Metric | Old v3 | **Tuned v3** |
|---|---|---|
| ROC-AUC (ranking risky above safe; 0.5 = coin flip) | 0.577 | **0.609** |
| Landslides caught at Moderate+ (recall) | 41% (old alert level) | **70%** |
| Safe places wrongly alerted at Moderate+ | 31% | 53% (more alerts: the cost of catching more) |
| Safe places wrongly alerted (at 70% caught) | 61% | **54%** |
| Alerts that were real (at 70% caught) | 38% | **40%** |
| Overfitting gap (training minus unseen) | 0.43 | **0.07** |

**Why not "90% accuracy"?** The older v2 model reported 90%, but its "safe" examples were plains and glaciers, so it only learned "hills = danger". On a fair test it scored below a coin flip. With 2 safe rows for every landslide, a model that never warns would score 67% accuracy while catching nothing. That's why Terra Alert reports **recall and false alarms** instead.

Full details: [ai-module/v3/docs/V3_BEFORE_AFTER.pdf](ai-module/v3/docs/V3_BEFORE_AFTER.pdf) · [ai-module/v3/docs/MODEL_STATUS_v3.pdf](ai-module/v3/docs/MODEL_STATUS_v3.pdf)

## Project structure

```
Terra-Alert/
├── backend/                     Flask API (port 5000)
│   ├── app.py                   entry point; routes under /api
│   ├── routes/                  api_routes, forecast_routes, chatbot, admin_routes
│   ├── services/
│   │   ├── gee_service.py       satellite data (Google Earth Engine) + safety guards
│   │   ├── model_service.py     risk score, levels, low-confidence warnings
│   │   └── model_registry.py    loads v2 / v3 / v4, remembers the active one
│   ├── utils/data_processor.py  the 20 model inputs (shared by training and live)
│   ├── ml/models/               installed models (not in git - see Retraining)
│   └── tests/                   pytest suite
│
├── frontend/                    React + Vite web dashboard (port 5173)
├── mobile/                      Android app: Expo SDK 58 + Expo Router
│
├── ai-module/                   see ai-module/README.md
│   ├── data/                    raw inputs and dataset CSVs (raw/, v2/, v3/)
│   ├── v2/                      original model, kept for comparison
│   ├── v3/                      live model: build/, train/, evaluate/, results/, models/
│   ├── v4/                      steadier-forecast variant of v3
│   ├── v5/                      terrain experiment (not used by the app)
│   └── tools/                   forecast API helpers
│
└── docs/                        project documentation, SMS setup
```

## Getting started

**You need:** Python 3.11, Node.js 18+, a Google Earth Engine project, and a Supabase project (the free tier works). Without Supabase, the backend still runs but saves nothing.

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in GEE_PROJECT_ID, SUPABASE_*, GEMINI_API_KEY, ADMIN_PIN
earthengine authenticate    # first time only
python app.py               # http://localhost:5000
```

### 2. Web dashboard

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api, VITE_SUPABASE_*
npm run dev                 # http://localhost:5173
```

### 3. Android app

```bash
cd mobile
npm install
cp .env.example .env        # EXPO_PUBLIC_API_URL=http://<your PC's LAN IP>:5000/api
npx expo start              # scan the QR code with Expo Go, or press "a" for an emulator
```

A phone can't reach `localhost` on your PC, so use your PC's LAN IP (`ipconfig`). On the Android emulator, use `http://10.0.2.2:5000/api`. More in [mobile/README.md](mobile/README.md).

## Testing

| What | Command | Covers |
|---|---|---|
| Model safety tests | `cd backend && py -3.11 -m pytest tests/test_v3_model.py -q` | Cut-offs, plains rule, "more rain never lowers risk", low-confidence warnings, missing-data guards, v2 unchanged. Offline, ~3 s |
| Full backend suite | `cd backend && py -3.11 -m pytest tests -q` | Above plus the end-to-end pipeline (needs Earth Engine) |
| Mobile lint | `cd mobile && npx expo lint` | Code errors and React rules |
| Rain source check | `py -3.11 ai-module/v3/evaluate/compare_rain_sources_v3.py --log-only` | Which rain source live checks really used |

**Manual checklist before a release:**
- [ ] Check Shimla in the monsoon: Moderate or higher, with a warning sentence naming the rain
- [ ] Check Delhi: Low, "flat, low-lying ground"
- [ ] Turn off Wi-Fi mid-check: a clear error, never a Low score
- [ ] Map tab: tap a district and read the sentence (no "% confidence")
- [ ] Settings → Prediction model (admin): v3 shows recall and false-alarm numbers
- [ ] An alert banner appears for Moderate+ and "Tap for what to do" opens the guidance

## Retraining the model

Model files are **not in git** (they are large and binary), so a fresh clone must train or copy them. All commands run from the repository root:

```bash
py -3.11 -m pip install shap                    # once, needed by the evaluation step
py -3.11 ai-module/v3/train/tune_v3.py                # ~15 min: picks settings on unseen areas
py -3.11 ai-module/v3/train/train_xgboost_v3.py       # trains, installs, then picks the risk cut-offs
# restart the backend to load the new model
```

To run the whole pipeline after rebuilding the dataset, use `powershell -ExecutionPolicy Bypass -File ai-module\v3\run_after_build.ps1`. It stops at the first failing step. The previous model is backed up in `ai-module/v3/backup_before_tuning_2026-11-13/`.

## API

All routes are under `http://localhost:5000/api`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/predict` | Risk for `{lat, lon}`: score, level, `low_confidence`, `warnings`, inputs, forecast |
| GET | `/districts`, `/districts/himachal` | Current risk for each district |
| POST | `/forecast/predict` | 30-day risk outlook from the rainfall forecast |
| GET | `/alerts`, `/predictions`, `/history/<id>`, `/stats` | Stored alerts, history and statistics |
| POST | `/chatbot` | AI assistant |
| GET | `/models` · POST `/admin/model` | List models · switch the active model (admin PIN) |
| GET | `/health` | Backend status |

## Known limits

- **Many false alarms.** At the alert level, about half of the safe places in the test were also flagged. Neighbouring slopes on the same rainy day look almost identical to the satellite data (rain is measured in ~10 km squares).
- **About 3 in 10 landslides come without an alert.** Fewer are caught outside the monsoon (44%) and in Kashmir (60%) than in Uttarakhand (80%).
- **Old, news-based training data** (2007–2016). Remote landslides and recent disasters are missing. The Geological Survey of India's Bhukosh inventory would be the biggest single improvement.
- **The web dashboard** does not show the low-confidence badge yet. The backend already sends it.

## Further reading

- [ai-module/v3/docs/V3_BEFORE_AFTER.pdf](ai-module/v3/docs/V3_BEFORE_AFTER.pdf): what changed in the model, with before/after numbers
- [ai-module/v3/docs/MODEL_STATUS_v3.pdf](ai-module/v3/docs/MODEL_STATUS_v3.pdf): model status, data and plan
- [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md): full project documentation
- [docs/TWILIO_SMS_SETUP.md](docs/TWILIO_SMS_SETUP.md): SMS alerts
- [mobile/README.md](mobile/README.md) · [backend/README.md](backend/README.md)

## Acknowledgements

NASA (GPM IMERG, MODIS), USGS (SRTM), OpenLandMap, Google Earth Engine, Open-Meteo, Supabase, OpenStreetMap, and the NDMA / HPSDMA landslide safety guidance used in the app.

---

*Terra Alert is a student project and a decision-support tool. It does not replace official warnings.*
