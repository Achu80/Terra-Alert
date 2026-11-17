   -- TerraAlert: SMS alert subscribers
   -- Run in the Supabase SQL Editor. Safe to run more than once.

   CREATE TABLE IF NOT EXISTS subscribers (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       phone TEXT NOT NULL,                      -- E.164 format, e.g. +919876543210
       lat DOUBLE PRECISION NOT NULL,
       lon DOUBLE PRECISION NOT NULL,
       location_key TEXT NOT NULL,               -- "lat,lon" rounded to 2 decimals (~1 km)
       location_name TEXT,
       active BOOLEAN NOT NULL DEFAULT TRUE,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       UNIQUE (phone, location_key)              -- same person + same place = one row
   );

   CREATE INDEX IF NOT EXISTS idx_subscribers_active_lat ON subscribers(active, lat);

   -- PRIVACY: phone numbers are personal data.
   -- RLS is ON and there are deliberately NO policies, so the public anon key
   -- (used by the website and mobile app) can read nothing from this table.
   -- Only the backend (service_role key) can read and write it.
   ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;