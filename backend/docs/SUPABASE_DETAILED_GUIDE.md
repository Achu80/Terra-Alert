# Supabase Database - Complete Guide
## GeoSafe Landslide Prediction System

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Tables & Schema](#tables--schema)
4. [Data Flow](#data-flow)
5. [Current Usage Status](#current-usage-status)
6. [Repository Pattern](#repository-pattern)
7. [Setup Instructions](#setup-instructions)
8. [Example Queries](#example-queries)

---

## 🎯 Overview

**Supabase** is an open-source Firebase alternative built on PostgreSQL. In GeoSafe, it provides:

- **PostgreSQL Database** - Relational data storage
- **PostGIS Extension** - Geospatial data support (polygons, points, spatial queries)
- **RESTful API** - Auto-generated API for database operations
- **Real-time Subscriptions** - Live data updates (not currently used)
- **Row Level Security** - Fine-grained access control (optional)

### Why Supabase?

✅ **PostgreSQL** - Industry-standard, reliable, powerful  
✅ **PostGIS** - Native geospatial support for district boundaries  
✅ **Free Tier** - 500MB database, 2GB bandwidth/month  
✅ **Easy Setup** - No server management required  
✅ **Python SDK** - Clean API for database operations  

---

## 🏗️ Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  districts   │  │ risk_history │  │   alerts     │     │
│  │              │  │              │  │              │     │
│  │ - id         │  │ - id         │  │ - id         │     │
│  │ - district_id│  │ - district_id│  │ - district_id│     │
│  │ - name       │  │ - date       │  │ - level      │     │
│  │ - geometry   │  │ - risk_score │  │ - score      │     │
│  │ - risk_score │  │ - risk_level │  │ - trigger    │     │
│  │ - risk_level │  │ - features   │  │ - created_at │     │
│  │ - features   │  │ - model_scores│ │ - acknowledged│    │
│  │ - confidence │  │ - created_at │  │              │     │
│  │ - last_updated│ │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│  ┌──────────────┐  ┌──────▼──────────┐                    │
│  │  settings    │  │prediction_cache │                    │
│  │              │  │                 │                    │
│  │ - id         │  │ - id            │                    │
│  │ - thresholds │  │ - location_key  │                    │
│  │ - weights    │  │ - lat           │                    │
│  │ - refresh_int│  │ - lon           │                    │
│  │ - notifications│ │ - prediction_data│                  │
│  │ - updated_at │  │ - created_at    │                    │
│  └──────────────┘  └─────────────────┘                    │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │              dashboard_stats (VIEW)               │      │
│  │  - total_districts, critical_count, high_count   │      │
│  │  - moderate_count, low_count, avg_risk_score     │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Tables & Schema

### 1. **districts** Table

**Purpose:** Store district information with geospatial boundaries and current risk assessment

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `district_id` | TEXT | Unique district identifier (e.g., "DL-001") |
| `name` | TEXT | District name (e.g., "New Delhi") |
| `geometry` | GEOMETRY(Polygon) | District boundary (PostGIS polygon) |
| `risk_score` | FLOAT | Current risk score (0-100) |
| `risk_level` | TEXT | Risk level: CRITICAL/HIGH/MODERATE/LOW |
| `confidence` | FLOAT | Model confidence (0-1) |
| `features` | JSONB | Feature values used for prediction |
| `model_scores` | JSONB | Individual model scores (if ensemble) |
| `last_updated` | TIMESTAMPTZ | Last prediction timestamp |
| `area_km2` | FLOAT | District area in square kilometers |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |

**Indexes:**
- Spatial index on `geometry` (GIST) - Fast geospatial queries
- Index on `risk_level` - Fast filtering by risk
- Index on `district_id` - Fast lookups

**Example Row:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "district_id": "DL-001",
  "name": "New Delhi",
  "geometry": "POLYGON((77.1 28.5, 77.3 28.5, 77.3 28.7, 77.1 28.7, 77.1 28.5))",
  "risk_score": 45.2,
  "risk_level": "MODERATE",
  "confidence": 0.87,
  "features": {
    "soil_type": 5,
    "ndvi": 0.45,
    "rainfall_30d": 120,
    "slope": 15
  },
  "last_updated": "2026-04-21T14:30:00Z",
  "area_km2": 1484.0
}
```

---

### 2. **risk_history** Table

**Purpose:** Track historical risk scores for trend analysis and visualization

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `district_id` | TEXT | Foreign key to districts |
| `date` | TIMESTAMPTZ | Prediction timestamp |
| `risk_score` | FLOAT | Risk score at this time |
| `risk_level` | TEXT | Risk level at this time |
| `features` | JSONB | Feature values used |
| `model_scores` | JSONB | Model scores |
| `created_at` | TIMESTAMPTZ | Record creation time |

**Indexes:**
- Index on `district_id` - Fast filtering by district
- Index on `date DESC` - Fast time-series queries

**Use Cases:**
- Show risk trends over time (line charts)
- Compare current vs historical risk
- Identify seasonal patterns
- Generate reports

**Example Row:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "district_id": "DL-001",
  "date": "2026-04-20T10:00:00Z",
  "risk_score": 42.8,
  "risk_level": "MODERATE",
  "features": {...},
  "created_at": "2026-04-20T10:00:00Z"
}
```

---

### 3. **alerts** Table

**Purpose:** Store high-risk alerts for notification and monitoring

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `district_id` | TEXT | Foreign key to districts |
| `level` | TEXT | Alert level (CRITICAL/HIGH) |
| `score` | FLOAT | Risk score that triggered alert |
| `trigger` | TEXT | What triggered the alert |
| `created_at` | TIMESTAMPTZ | Alert creation time |
| `acknowledged` | BOOLEAN | Has alert been acknowledged? |

**Indexes:**
- Index on `district_id` - Fast filtering
- Index on `created_at DESC` - Recent alerts first
- Index on `acknowledged` - Filter unacknowledged

**Use Cases:**
- Show unacknowledged alerts in dashboard
- Send email/SMS notifications
- Alert history and audit trail
- Trigger automated responses

**Example Row:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "district_id": "DL-001",
  "level": "HIGH",
  "score": 72.5,
  "trigger": "Risk score exceeded 70 threshold",
  "created_at": "2026-04-21T08:00:00Z",
  "acknowledged": false
}
```

---

### 4. **settings** Table

**Purpose:** Store application configuration and thresholds

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `thresholds` | JSONB | Risk level thresholds |
| `weights` | JSONB | Model ensemble weights |
| `refresh_interval` | INTEGER | Minutes between updates |
| `notifications` | JSONB | Notification settings |
| `updated_at` | TIMESTAMPTZ | Last update time |

**Default Values:**
```json
{
  "thresholds": {
    "critical": 80,
    "high": 60,
    "moderate": 40
  },
  "weights": {
    "rf": 0.4,
    "adaboost": 0.3,
    "bagging": 0.3
  },
  "refresh_interval": 15,
  "notifications": {
    "email": false,
    "digest": false,
    "retrain": false
  }
}
```

**Use Cases:**
- Configure risk thresholds
- Adjust model weights
- Enable/disable notifications
- Set refresh intervals

---

### 5. **prediction_cache** Table (Optional)

**Purpose:** Cache predictions to reduce API calls and improve performance

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `location_key` | TEXT | Unique location identifier |
| `lat` | FLOAT | Latitude |
| `lon` | FLOAT | Longitude |
| `prediction_data` | JSONB | Complete prediction response |
| `created_at` | TIMESTAMPTZ | Cache timestamp |

**Auto-cleanup:** Entries older than 7 days are automatically deleted

**Example Row:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "location_key": "28.6139_77.2090",
  "lat": 28.6139,
  "lon": 77.2090,
  "prediction_data": {
    "score": 45.2,
    "level": "MODERATE",
    "features": {...}
  },
  "created_at": "2026-04-21T14:00:00Z"
}
```

---

### 6. **dashboard_stats** View

**Purpose:** Aggregate statistics for dashboard display

**Computed Columns:**
- `total_districts` - Total number of districts
- `critical_count` - Districts with CRITICAL risk
- `high_count` - Districts with HIGH risk
- `moderate_count` - Districts with MODERATE risk
- `low_count` - Districts with LOW risk
- `avg_risk_score` - Average risk score across all districts
- `last_refresh` - Most recent update timestamp

**Example Output:**
```json
{
  "total_districts": 150,
  "critical_count": 5,
  "high_count": 15,
  "moderate_count": 45,
  "low_count": 85,
  "avg_risk_score": 38.5,
  "last_refresh": "2026-04-21T14:30:00Z"
}
```

---

## 🔄 Data Flow

### Scenario 1: Static District Monitoring (Original Design)

```
┌─────────────────────────────────────────────────────────────┐
│                    SCHEDULED JOB                             │
│              (Runs every 15 minutes)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Fetch all districts from Supabase                        │
│     SELECT * FROM districts                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. For each district:                                       │
│     - Get district center point (lat, lon)                   │
│     - Fetch GEE data for that location                       │
│     - Process features                                       │
│     - Make XGBoost prediction                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Update district in Supabase:                             │
│     UPDATE districts SET                                     │
│       risk_score = 45.2,                                     │
│       risk_level = 'MODERATE',                               │
│       features = {...},                                      │
│       last_updated = NOW()                                   │
│     WHERE district_id = 'DL-001'                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Add to risk history:                                     │
│     INSERT INTO risk_history (...)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Check if alert needed:                                   │
│     IF risk_score > 60 THEN                                  │
│       INSERT INTO alerts (...)                               │
│       Send notification                                      │
└─────────────────────────────────────────────────────────────┘
```

### Scenario 2: Dynamic Point Prediction (Current Implementation)

```
┌─────────────────────────────────────────────────────────────┐
│              USER CLICKS ON MAP                              │
│            (lat: 28.6139, lon: 77.2090)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend sends: POST /api/predict                           │
│  { "lat": 28.6139, "lon": 77.2090 }                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend checks cache (optional):                            │
│  SELECT * FROM prediction_cache                              │
│  WHERE location_key = '28.6139_77.2090'                      │
│  AND created_at > NOW() - INTERVAL '2 hours'                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  If not cached:                                              │
│  1. Fetch GEE data for location                              │
│  2. Process features                                         │
│  3. Make XGBoost prediction                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Save to cache (optional):                                   │
│  INSERT INTO prediction_cache (...)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Return prediction to frontend                               │
│  { "score": 45.2, "level": "MODERATE", ... }                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 Current Usage Status

### ✅ What's Set Up:

1. **Supabase Account** - Created and configured
2. **Database Schema** - All tables created
3. **Connection** - Backend can connect to Supabase
4. **Repository Layer** - Python classes for database operations
5. **API Endpoints** - Routes exist for database operations

### ⚠️ What's NOT Being Used:

**The database is currently EMPTY and NOT actively used because:**

1. **No Districts Defined** - The `districts` table is empty
2. **Dynamic Predictions** - Current implementation doesn't need pre-defined areas
3. **Direct GEE → Model Flow** - Predictions go straight from GEE to model to response

### 🎯 When Database WILL Be Used:

**Future scenarios where database becomes essential:**

1. **District Monitoring Dashboard**
   - Pre-define 100+ districts
   - Monitor all districts continuously
   - Show map with color-coded risk levels

2. **Historical Tracking**
   - Store prediction history
   - Show risk trends over time
   - Generate reports

3. **Alert System**
   - Trigger alerts when risk exceeds threshold
   - Send email/SMS notifications
   - Track alert acknowledgments

4. **Performance Optimization**
   - Cache predictions for frequently queried locations
   - Reduce GEE API calls
   - Faster response times

---

## 🔧 Repository Pattern

The project uses the **Repository Pattern** to abstract database operations:

### Repository Classes

**1. DistrictRepository**
```python
from database.repositories import DistrictRepository

repo = DistrictRepository()

# Get all districts
districts = repo.get_all()

# Get single district
district = repo.get_by_id("DL-001")

# Update risk score
repo.update_risk_score(
    district_id="DL-001",
    score=45.2,
    level="MODERATE",
    features={...},
    model_scores={...},
    confidence=0.87
)
```

**2. RiskHistoryRepository**
```python
from database.repositories import RiskHistoryRepository

repo = RiskHistoryRepository()

# Add history entry
repo.add_entry(
    district_id="DL-001",
    score=45.2,
    level="MODERATE",
    features={...},
    model_scores={...}
)

# Get history
history = repo.get_history(
    district_id="DL-001",
    from_date="2026-04-01",
    to_date="2026-04-21"
)
```

**3. AlertRepository**
```python
from database.repositories import AlertRepository

repo = AlertRepository()

# Create alert
alert = repo.create_alert(
    district_id="DL-001",
    level="HIGH",
    score=72.5,
    trigger="Risk exceeded threshold"
)

# Get recent alerts
alerts = repo.get_recent_alerts(limit=10, level="HIGH")

# Acknowledge alert
repo.acknowledge_alert(alert_id="...")
```

**4. StatsRepository**
```python
from database.repositories import StatsRepository

repo = StatsRepository()

# Get dashboard stats
stats = repo.get_dashboard_stats()
# Returns: {total_districts, critical_count, high_count, ...}
```

---

## 🚀 Setup Instructions

### 1. Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Create new project
4. Wait for database provisioning (~2 minutes)

### 2. Run SQL Schema

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy contents of `backend/database/supabase_schema.sql`
4. Paste and click **Run**
5. (Optional) Run `backend/database/cache_schema.sql` for caching

### 3. Get API Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public** key
   - **service_role** key (keep secret!)

### 4. Configure Backend

Add to `backend/.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 5. Test Connection

```bash
cd backend
python -c "from database.supabase_client import get_supabase; print(get_supabase())"
```

Should output: `✓ Supabase client initialized`

---

## 📝 Example Queries

### Insert District

```python
from database.repositories import DistrictRepository

repo = DistrictRepository()

district = repo.create({
    "district_id": "DL-001",
    "name": "New Delhi",
    "geometry": "POLYGON((77.1 28.5, 77.3 28.5, 77.3 28.7, 77.1 28.7, 77.1 28.5))",
    "risk_score": 0,
    "risk_level": "LOW",
    "area_km2": 1484.0
})
```

### Update Risk Score

```python
repo.update_risk_score(
    district_id="DL-001",
    score=45.2,
    level="MODERATE",
    features={
        "soil_type": 5,
        "ndvi": 0.45,
        "rainfall_30d": 120,
        "slope": 15
    },
    model_scores={"xgboost": 45.2},
    confidence=0.87
)
```

### Get High-Risk Districts

```python
districts = repo.get_all()
high_risk = [d for d in districts if d['risk_level'] in ['HIGH', 'CRITICAL']]
```

### Create Alert

```python
from database.repositories import AlertRepository

alert_repo = AlertRepository()

alert = alert_repo.create_alert(
    district_id="DL-001",
    level="HIGH",
    score=72.5,
    trigger="Risk score exceeded 70 threshold"
)
```

### Get Dashboard Stats

```python
from database.repositories import StatsRepository

stats_repo = StatsRepository()
stats = stats_repo.get_dashboard_stats()

print(f"Total Districts: {stats['total_districts']}")
print(f"Critical: {stats['critical_count']}")
print(f"High: {stats['high_count']}")
print(f"Average Risk: {stats['avg_risk_score']:.1f}")
```

---

## 🎯 Summary

### Current State:
- ✅ Database schema created
- ✅ Connection working
- ✅ Repository layer implemented
- ⚠️ **NOT actively used** - predictions are fully dynamic

### Future Use:
- 📋 District monitoring dashboard
- 📋 Historical trend analysis
- 📋 Alert system
- 📋 Performance caching

### Key Takeaway:
**Supabase is ready but optional.** The current implementation works perfectly without it for dynamic, on-demand predictions. It will become essential when you add:
- Pre-defined district monitoring
- Historical tracking
- Alert notifications
- Performance optimization

---

**Last Updated:** April 21, 2026  
**Status:** Configured but not actively used
