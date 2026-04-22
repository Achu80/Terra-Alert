# 🌍 GeoSafe AI – Landslide Prediction & Risk Analysis System

GeoSafe AI is a smart disaster management system designed to predict landslide risks using machine learning and geospatial data analysis. The system processes environmental parameters such as rainfall, terrain, slope, and soil conditions to classify areas into different risk levels (Low, Moderate, High, Critical).

## 🚀 Key Features
- 📊 Real-time data processing from Google Earth Engine (GEE)
- 🤖 XGBoost ML model for accurate risk prediction
- 🗺️ Interactive map with click-anywhere predictions
- 📈 Dashboard with statistics and trend analysis
- 🚨 Automated alert system for high-risk areas
- 💾 **Supabase integration** for data persistence and real-time updates
- 🔄 Caching system for improved performance
- 📱 Responsive React frontend with modern UI

## 🗄️ Database Integration (Supabase)

**✅ Fully Integrated!** The project now uses Supabase (PostgreSQL + PostGIS) for:
- **Districts Management** - Store and track district-level risk data
- **Risk History** - Time-series analysis and trend tracking
- **Alerts System** - Automated notifications for high-risk areas
- **Prediction Cache** - Performance optimization
- **Real-time Updates** - Live data synchronization across clients

### Quick Links
- 📖 **[Supabase Integration Guide](./SUPABASE_INTEGRATION_GUIDE.md)** - Complete setup and usage
- 🚀 **[Setup Complete Summary](./SUPABASE_SETUP_COMPLETE.md)** - What's been configured
- 📋 **[Quick Reference](./SUPABASE_QUICK_REFERENCE.md)** - Common commands and examples
- 💿 **[Installation Help](./INSTALL_SUPABASE.md)** - Troubleshooting installation

### Database Features
- ✅ PostgreSQL with PostGIS for geospatial queries
- ✅ Real-time subscriptions for live updates
- ✅ Repository pattern for clean code architecture
- ✅ Caching layer for performance
- ✅ Both backend and frontend integration

## 🧠 How It Works
1. **User clicks on map** → Selects location for prediction
2. **Backend fetches GEE data** → Satellite imagery, rainfall, terrain, soil
3. **ML model processes** → XGBoost predicts landslide risk (0-100)
4. **Data saved to Supabase** → Districts, history, alerts, cache
5. **Results displayed** → Interactive map with risk visualization
6. **Real-time updates** → Dashboard shows live statistics and trends

## 🎯 Objective
To provide a scalable and intelligent system that helps authorities predict landslides early and take preventive actions, ultimately reducing risk to human life and infrastructure.

## 🛠️ Tech Stack

### Frontend
- **React.js** - Modern UI framework
- **Vite** - Fast build tool
- **Leaflet** - Interactive maps
- **Recharts** - Data visualization
- **Framer Motion** - Smooth animations
- **Supabase JS Client** - Real-time database access

### Backend
- **Flask** - Python web framework
- **Google Earth Engine (GEE)** - Satellite data
- **XGBoost** - Machine learning model
- **Supabase Python Client** - Database operations
- **NumPy/Pandas** - Data processing

### Database
- **Supabase** - PostgreSQL + PostGIS
- **PostGIS** - Geospatial extensions
- **Real-time** - Live data synchronization

### APIs
- **Google Earth Engine** - Satellite imagery and terrain data
- **OpenWeather API** - Weather forecasts
- **Supabase REST API** - Database operations

## 📁 Project Structure

```
GeoSafe/
├── backend/
│   ├── database/
│   │   ├── supabase_client.py      # Database connection
│   │   ├── repositories.py         # Data operations
│   │   └── cache_repository.py     # Caching layer
│   ├── services/
│   │   ├── model_service.py        # ML predictions
│   │   └── gee_service.py          # Google Earth Engine
│   ├── routes/
│   │   └── api_routes.py           # API endpoints
│   └── app.py                      # Flask application
│
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── api.js              # API client
│   │   │   └── supabase.js         # Supabase client
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # Landing page
│   │   │   ├── DashboardPage.jsx   # Statistics dashboard
│   │   │   ├── MapExplorerPage.jsx # Interactive map
│   │   │   └── PredictionPage.jsx  # Prediction interface
│   │   └── components/             # Reusable components
│   └── package.json
│
├── ai-module/
│   ├── train_xgboost_v2.py        # Model training
│   ├── xgboost_model_v2.pkl       # Trained model
│   └── scaler_v2.pkl              # Feature scaler
│
└── Documentation/
    ├── SUPABASE_INTEGRATION_GUIDE.md
    ├── SUPABASE_SETUP_COMPLETE.md
    ├── SUPABASE_QUICK_REFERENCE.md
    └── INSTALL_SUPABASE.md
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Google Earth Engine account
- Supabase account (free tier works!)

### 1. Clone Repository
```bash
git clone <repository-url>
cd GeoSafe
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Start backend
python app.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Start frontend
npm run dev
```

### 4. Access Application
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Supabase Dashboard:** https://supabase.com/dashboard

## 📖 Documentation

### Getting Started
- **[Quick Start Guide](./QUICK_START.md)** - Get up and running fast
- **[Installation Guide](./INSTALL_DEPENDENCIES.md)** - Detailed setup instructions

### Supabase Integration
- **[Integration Guide](./SUPABASE_INTEGRATION_GUIDE.md)** - Complete Supabase setup
- **[Quick Reference](./SUPABASE_QUICK_REFERENCE.md)** - Common commands
- **[Setup Summary](./SUPABASE_SETUP_COMPLETE.md)** - What's configured

### Backend
- **[AI Integration](./backend/docs/AI_INTEGRATION.md)** - ML model integration
- **[GEE Setup](./backend/docs/INTEGRATION_GUIDE.md)** - Google Earth Engine
- **[API Documentation](./backend/docs/README.md)** - API endpoints

### Frontend
- **[Architecture](./frontend/ARCHITECTURE.md)** - Frontend structure
- **[Components](./frontend/STRUCTURE.md)** - Component documentation

## 📌 Features in Detail

### 🗺️ Interactive Map
- Click anywhere to get instant risk prediction
- View Himachal Pradesh districts with real-time risk levels
- Color-coded risk visualization (Low/Moderate/High/Critical)
- Detailed feature breakdown for each location

### 📊 Dashboard
- Real-time statistics across all districts
- Risk distribution charts
- 7-day trend analysis
- Recent predictions list
- Alert notifications

### 🚨 Alert System
- Automatic alerts for high-risk areas (score > 60)
- Critical alerts for extreme risk (score > 80)
- Alert acknowledgment system
- Real-time notifications (when enabled)

### 💾 Data Persistence
- All predictions saved to Supabase
- Historical data for trend analysis
- Caching for improved performance
- Real-time synchronization across clients

## 📌 Future Enhancements
- ✅ Real-time alert notifications (implemented with Supabase)
- ✅ Live data streaming (implemented with real-time subscriptions)
- ✅ Advanced analytics (implemented with dashboard)
- 🔄 Mobile app integration (planned)
- 🔄 SMS/Email notifications (planned)
- 🔄 Weather forecast integration (planned)
- 🔄 User authentication (planned)

## 👥 Users
- **Disaster Management Authorities** - Monitor and respond to risks
- **Government Agencies** - Policy making and resource allocation
- **Researchers & Analysts** - Study landslide patterns and trends
- **General Public** - Access risk information for their area

## 🤝 Contributing
Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments
- Google Earth Engine for satellite data
- Supabase for database infrastructure
- OpenWeather for weather data
- XGBoost team for the ML framework

---

💡 **"Turning data into actionable safety insights."**

🔗 **Quick Links:**
- [Supabase Dashboard](https://supabase.com/dashboard/project/lwurspqlazvnaqcyzdwg)
- [Integration Guide](./SUPABASE_INTEGRATION_GUIDE.md)
- [Quick Reference](./SUPABASE_QUICK_REFERENCE.md)
