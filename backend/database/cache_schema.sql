-- Optional: Add prediction cache table
-- Run this in Supabase SQL Editor if you want caching

CREATE TABLE IF NOT EXISTS prediction_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_key TEXT NOT NULL,
    lat FLOAT NOT NULL,
    lon FLOAT NOT NULL,
    prediction_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_prediction_cache_location ON prediction_cache(location_key);
CREATE INDEX idx_prediction_cache_created ON prediction_cache(created_at DESC);

-- Auto-delete old cache entries (older than 7 days)
CREATE OR REPLACE FUNCTION delete_old_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM prediction_cache
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
