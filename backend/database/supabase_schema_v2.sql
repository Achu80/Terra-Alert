-- TerraAlert Supabase Database Schema v2
-- Updated to support location-based predictions (no foreign key constraints)
-- Run this in Supabase SQL Editor

-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Districts table (optional - for pre-defined districts)
CREATE TABLE IF NOT EXISTS districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    geometry GEOMETRY(Polygon, 4326) NOT NULL,
    risk_score FLOAT DEFAULT 0,
    risk_level TEXT CHECK (risk_level IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
    confidence FLOAT,
    features JSONB,
    model_scores JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    area_km2 FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for faster geospatial queries
CREATE INDEX IF NOT EXISTS idx_districts_geometry ON districts USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_districts_risk_level ON districts(risk_level);
CREATE INDEX IF NOT EXISTS idx_districts_district_id ON districts(district_id);

-- Risk history table (NO FOREIGN KEY - allows any location)
CREATE TABLE IF NOT EXISTS risk_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id TEXT NOT NULL,  -- Can be location ID like "loc_31.1048_77.1734" or district ID
    date TIMESTAMPTZ NOT NULL,
    risk_score FLOAT NOT NULL,
    risk_level TEXT NOT NULL,
    features JSONB,
    model_scores JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_history_district ON risk_history(district_id);
CREATE INDEX IF NOT EXISTS idx_risk_history_date ON risk_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_risk_history_created ON risk_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_history_level ON risk_history(risk_level);

-- Alerts table (NO FOREIGN KEY - allows any location)
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id TEXT NOT NULL,  -- Can be location ID or district ID
    level TEXT NOT NULL,
    score FLOAT NOT NULL,
    trigger TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_alerts_district ON alerts(district_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thresholds JSONB DEFAULT '{"critical": 80, "high": 60, "moderate": 40}'::jsonb,
    weights JSONB DEFAULT '{"rf": 0.4, "adaboost": 0.3, "bagging": 0.3}'::jsonb,
    refresh_interval INTEGER DEFAULT 15,
    notifications JSONB DEFAULT '{"email": false, "digest": false, "retrain": false}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO settings (id) 
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for districts table
DROP TRIGGER IF EXISTS update_districts_updated_at ON districts;
CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for settings table
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for dashboard stats (from districts)
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    COUNT(*) as total_districts,
    COUNT(*) FILTER (WHERE risk_level = 'CRITICAL') as critical_count,
    COUNT(*) FILTER (WHERE risk_level = 'HIGH') as high_count,
    COUNT(*) FILTER (WHERE risk_level = 'MODERATE') as moderate_count,
    COUNT(*) FILTER (WHERE risk_level = 'LOW') as low_count,
    AVG(risk_score) as avg_risk_score,
    MAX(last_updated) as last_refresh
FROM districts;

-- View for prediction stats (from risk_history)
CREATE OR REPLACE VIEW prediction_stats AS
SELECT
    COUNT(*) as total_predictions,
    COUNT(*) FILTER (WHERE risk_level = 'CRITICAL') as critical_count,
    COUNT(*) FILTER (WHERE risk_level = 'HIGH') as high_count,
    COUNT(*) FILTER (WHERE risk_level = 'MODERATE') as moderate_count,
    COUNT(*) FILTER (WHERE risk_level = 'LOW') as low_count,
    AVG(risk_score) as avg_risk_score,
    MAX(created_at) as last_prediction
FROM risk_history;

-- Enable Row Level Security (optional, for production)
-- ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE risk_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'Schema v2 created successfully! No foreign key constraints.' AS status;
