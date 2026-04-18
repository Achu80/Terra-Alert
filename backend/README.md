# Backend API

## Project Structure

```
backend/
├── app.py                  # Main Flask application
├── config.py              # Configuration settings
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
│
├── routes/               # API endpoints
│   ├── __init__.py
│   └── api_routes.py     # Main API routes
│
├── services/             # Business logic
│   ├── __init__.py
│   ├── gee_service.py    # Google Earth Engine integration
│   └── model_service.py  # ML model inference
│
├── utils/                # Helper functions
│   ├── __init__.py
│   └── data_processor.py # Data processing utilities
│
├── tests/                # Test files
│   ├── __init__.py
│   ├── test_gee.py       # Test GEE connection
│   └── test_predict_endpoint.py  # Test API endpoints
│
└── docs/                 # Documentation
    ├── README.md         # Setup guide
    └── INTEGRATION_GUIDE.md  # Frontend integration
```

## Quick Start

1. Activate virtual environment:
   ```bash
   venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment:
   - Copy `.env.example` to `.env`
   - Add your `GEE_PROJECT_ID`

4. Run server:
   ```bash
   python app.py
   ```

## API Endpoints

- `GET /` - Health check
- `GET /api/health` - API health status
- `POST /api/gee/data` - Fetch raw GEE data
- `POST /api/gee/process` - Get processed GEE data
- `POST /api/predict` - Complete prediction pipeline

## Testing

```bash
# Test GEE connection
python tests/test_gee.py

# Test API endpoints (server must be running)
python tests/test_predict_endpoint.py
```

## Documentation

See `docs/` folder for detailed guides.
