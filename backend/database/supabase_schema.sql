-- TerraAlert Supabase Database Schema
-- Run this in Supabase SQL Editor

-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Districts table
CREATE TABLE districts (
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
CREATE INDEX idx_districts_geometry ON districts USING GIST(geometry);
CREATE INDEX idx_districts_risk_level ON districts(risk_level);
CREATE INDEX idx_districts_district_id ON districts(district_id);

-- Risk history table
CREATE TABLE risk_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id TEXT NOT NULL REFERENCES districts(district_id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    risk_score FLOAT NOT NULL,
    risk_level TEXT NOT NULL,
    features JSONB,
    model_scores JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_history_district ON risk_history(district_id);
CREATE INDEX idx_risk_history_date ON risk_history(date DESC);

-- Alerts table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id TEXT NOT NULL REFERENCES districts(district_id) ON DELETE CASCADE,
    level TEXT NOT NULL,
    score FLOAT NOT NULL,
    trigger TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_alerts_district ON alerts(district_id);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);

-- Settings table
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thresholds JSONB DEFAULT '{"critical": 80, "high": 60, "moderate": 40}'::jsonb,
    weights JSONB DEFAULT '{"rf": 0.4, "adaboost": 0.3, "bagging": 0.3}'::jsonb,
    refresh_interval INTEGER DEFAULT 15,
    notifications JSONB DEFAULT '{"email": false, "digest": false, "retrain": false}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (id) VALUES (gen_random_uuid());

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for districts table
CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for settings table
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for dashboard stats
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

-- Enable Row Level Security (optional, for production)
-- ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE risk_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
