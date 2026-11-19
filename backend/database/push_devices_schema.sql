   -- TerraAlert: phone notification devices (Expo push tokens)
   -- Run in the Supabase SQL Editor. Safe to run more than once.

   CREATE TABLE IF NOT EXISTS push_devices (
       token TEXT PRIMARY KEY,                   -- Expo push token, e.g. ExponentPushToken[...]
       lat DOUBLE PRECISION NOT NULL,            -- the place the person wants warnings for
       lon DOUBLE PRECISION NOT NULL,
       location_name TEXT,
       active BOOLEAN NOT NULL DEFAULT TRUE,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Lowest risk score this device is alerted for: 60 = High and above (locals), 80 = Critical only (visitors)
   ALTER TABLE push_devices ADD COLUMN IF NOT EXISTS min_score INTEGER NOT NULL DEFAULT 60;

   CREATE INDEX IF NOT EXISTS idx_push_devices_active_lat ON push_devices(active, lat);

   -- Same privacy rule as subscribers: RLS on, no policies, so only the backend (service_role) can read rows.
   ALTER TABLE push_devices ENABLE ROW LEVEL SECURITY;
