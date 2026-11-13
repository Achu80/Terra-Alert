# Terra Alert: Android App

React Native app built with **Expo SDK 58** and **Expo Router**. It uses the same Flask backend and Supabase project as the web dashboard (`frontend/`).

## Setup

```bash
cd mobile
npm install
cp .env.example .env    # then set EXPO_PUBLIC_API_URL
```

A phone can't reach `localhost` on your PC. Set `EXPO_PUBLIC_API_URL` to your PC's LAN IP, for example `http://192.168.1.10:5000/api` (find it with `ipconfig`). The backend already listens on all network interfaces. On the Android emulator, use `http://10.0.2.2:5000/api`.

| Variable | What it is |
|---|---|
| `EXPO_PUBLIC_API_URL` | Flask backend, ending in `/api` |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (history screen) |

## Run

```bash
npx expo start             # scan the QR code with Expo Go on your phone
npx expo start --android   # or open it in an Android emulator
```

## Screens

| Tab | What it shows |
|---|---|
| **Home** | Pick a place: risk score, level, a warning sentence, a low-confidence badge when needed, key conditions, heatmap and 30-day outlook |
| **Map** | Districts of Himachal Pradesh coloured by risk; tap one for its warning sentence |
| **History** | Past checks and trends by district |
| **Assistant** | AI chat that knows the current risk (text or voice) |
| **Settings** | Location, backend status, about; admin pages for the model, thresholds and data sources |

## How risk is worded

Results are **risk warnings, not predictions**. All wording comes from one place, `src/utils/risk.js`:

- `riskMessage()` builds the warning sentence, e.g. *"High landslide risk in Shimla today, mainly because of heavy rain (85 mm in 3 days). Be ready to move."* It never says a landslide *will* happen.
- `describeWarnings()` turns the backend's `warnings` (backup rain source, inputs outside the training range) into the text under the **Low confidence** badge.
- `RISK_DISCLAIMER` is the note shown under every result.
- What to do at each level lives in `src/constants/riskGuidance.js` (based on NDMA / HPSDMA guidance).

Don't show the model's raw "confidence" to users. It reads like a % chance of a landslide, but it isn't one. It's only shown on the admin model line.

## Project structure

```
src/
  app/                    screens (Expo Router: every file is a route)
    _layout.js
    (tabs)/               Home, Map, History, Assistant, Settings
  components/             shared UI (home/, alerts/, map/, settings/, assistant/ ...)
  constants/              riskGuidance.js (what to do), himachal.js
  context/                prediction, alerts, location, settings, admin state
  services/               api.js (Flask backend), supabase.js, geocoding.js
  utils/risk.js           levels, colours and all user-facing risk wording
  theme/                  colours
```

## Checks before committing

```bash
npx expo lint
```

Always add packages with `npx expo install <pkg>`, so their versions match the Expo SDK.
