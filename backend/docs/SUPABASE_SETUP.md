# Supabase Setup Guide for TerraAlert

## Step-by-Step Setup

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: terraalert
   - **Database Password**: (create a strong password and save it!)
   - **Region**: Choose closest to your location
5. Click "Create new project"
6. Wait 2-3 minutes for provisioning

### 2. Get Your Credentials

1. Once project is ready, go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (for frontend)
   - **service_role** key (for backend - keep this secret!)

### 3. Run Database Schema

1. In Supabase dashboard, click **SQL Editor** (in sidebar)
2. Click **New Query**
3. Copy the entire contents of `backend/database/supabase_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

### 4. Verify Tables Created

1. Click **Table Editor** in sidebar
2. You should see these tables:
   - districts
   - risk_history
   - alerts
   - settings
   - dashboard_stats (view)

### 5. Configure Backend

1. Update your `.env` file:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 6. Test Connection

Run this test script:

```bash
python backend/database/test_connection.py
```

## Database Schema Overview

### districts
- Stores district geometry (GeoJSON polygons)
- Current risk scores and levels
- Latest features from GEE
- Model scores (RF, AdaBoost, Bagging)

### risk_history
- Time-series of risk scores per district
- Used for historical charts and trends

### alerts
- Critical/High risk alerts
- Trigger information
- Acknowledgment status

### settings
- Risk thresholds (Critical: 80, High: 60, etc.)
- Model ensemble weights
- Notification preferences

## PostGIS Functions

Supabase includes PostGIS for geospatial queries:

```sql
-- Find districts within 50km of a point
SELECT * FROM districts
WHERE ST_DWithin(
  geometry,
  ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
  50000
);

-- Calculate area in km²
SELECT district_id, ST_Area(geometry::geography) / 1000000 as area_km2
FROM districts;

-- Find neighboring districts
SELECT d2.name
FROM districts d1, districts d2
WHERE d1.district_id = 'pune'
AND ST_Touches(d1.geometry, d2.geometry);
```

## Next Steps

1. ✓ Create Supabase project
2. ✓ Run schema SQL
3. ✓ Configure .env
4. ✓ Install dependencies
5. → Seed district data (GeoJSON import)
6. → Update API routes to use Supabase
7. → Test with GEE integration

## Troubleshooting

**Error: "extension postgis does not exist"**
- PostGIS should be enabled by default
- If not, run: `CREATE EXTENSION postgis;` in SQL Editor

**Error: "permission denied"**
- Make sure you're using the service_role key in backend
- Check RLS policies if enabled

**Connection timeout**
- Check your SUPABASE_URL is correct
- Verify project is not paused (free tier pauses after inactivity)

## Useful Supabase Features

- **Real-time**: Subscribe to table changes for live alerts
- **Storage**: Store PDF reports, images
- **Auth**: User authentication (if needed later)
- **Edge Functions**: Serverless functions (alternative to Flask routes)
