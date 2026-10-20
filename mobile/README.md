# Terra Alert – Mobile (Android)

React Native app built with Expo (SDK 58) and Expo Router. Uses the same Flask backend and Supabase project as `frontend/`.

## Setup

```bash
cd mobile
npm install
cp .env.example .env   # then set EXPO_PUBLIC_API_URL
```

The phone can't reach `localhost` on your PC. Set `EXPO_PUBLIC_API_URL` to your PC's LAN IP (e.g. `http://192.168.1.10:5000/api`, find it with `ipconfig`) and run Flask on all interfaces: `app.run(host='0.0.0.0', port=5000)`. Android emulator: `http://10.0.2.2:5000/api`.

## Run

```bash
npx expo start        # scan the QR code with Expo Go on your Android phone
npx expo start --android   # or open in an Android emulator
```

## Structure

```
src/
  app/            # screens (Expo Router: every file is a route)
    _layout.js
    (tabs)/       # bottom tabs: Home, Map, Alerts, Assistant, Settings
  components/     # shared UI
  config/env.js   # EXPO_PUBLIC_* env vars
  services/       # api.js (Flask backend), supabase.js
  theme/          # colors
```

Always add packages with `npx expo install <pkg>` so versions match the Expo SDK.
