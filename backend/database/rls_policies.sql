-- TerraAlert: Row Level Security policies + districts trigger fix
-- Run in the Supabase SQL Editor AFTER supabase_schema_v2.sql. Safe to run more than once.
--
-- Why: with RLS enabled and no policies, the anon key (used by the mobile app and the website)
-- sees zero rows. The backend uses the service_role key, which bypasses RLS, so it is not affected.
-- Each policy below grants only what the app/website code actually does.

-- ---------------------------------------------------------------
-- risk_history: read-only (mobile History tab, website dashboards). Inserts come from the backend.
-- ---------------------------------------------------------------
ALTER TABLE risk_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read risk_history" ON risk_history;
CREATE POLICY "Public read risk_history" ON risk_history
    FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------
-- districts: read-only
-- ---------------------------------------------------------------
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read districts" ON districts;
CREATE POLICY "Public read districts" ON districts
    FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------
-- alerts: read + acknowledge (website marks alerts as acknowledged)
-- ---------------------------------------------------------------
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read alerts" ON alerts;
CREATE POLICY "Public read alerts" ON alerts
    FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public acknowledge alerts" ON alerts;
CREATE POLICY "Public acknowledge alerts" ON alerts
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------
-- settings: read + save (website Settings page writes directly; the mobile app saves through the backend)
-- ---------------------------------------------------------------
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read settings" ON settings;
CREATE POLICY "Public read settings" ON settings
    FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public insert settings" ON settings;
CREATE POLICY "Public insert settings" ON settings
    FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public update settings" ON settings;
CREATE POLICY "Public update settings" ON settings
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------
-- prediction_cache: read, add and clear (website caches predictions directly)
-- (skipped automatically if cache_schema.sql has not been run)
-- ---------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.prediction_cache') IS NOT NULL THEN
        ALTER TABLE prediction_cache ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public read prediction_cache" ON prediction_cache;
        CREATE POLICY "Public read prediction_cache" ON prediction_cache
            FOR SELECT TO anon, authenticated USING (true);
        DROP POLICY IF EXISTS "Public insert prediction_cache" ON prediction_cache;
        CREATE POLICY "Public insert prediction_cache" ON prediction_cache
            FOR INSERT TO anon, authenticated WITH CHECK (true);
        DROP POLICY IF EXISTS "Public delete prediction_cache" ON prediction_cache;
        CREATE POLICY "Public delete prediction_cache" ON prediction_cache
            FOR DELETE TO anon, authenticated USING (true);
    END IF;
END $$;

-- ---------------------------------------------------------------
-- Fix: the districts trigger set NEW.updated_at, but districts has `last_updated`,
-- so every UPDATE on districts failed with "record new has no field updated_at".
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_districts_updated_at ON districts;
CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts
    FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

SELECT 'RLS policies and districts trigger applied.' AS status;
