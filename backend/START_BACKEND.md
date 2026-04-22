# How to Start the Backend Server

## Step 1: Open Command Prompt (CMD)
Press `Win + R`, type `cmd`, and press Enter

## Step 2: Navigate to Backend Directory
```bash
cd "D:\VS-Code projects\GeoSafe\backend"
```

## Step 3: Activate Virtual Environment (if you have one)
```bash
venv\Scripts\activate
```

## Step 4: Install Dependencies (if not already installed)
```bash
pip install -r requirements.txt
```

## Step 5: Start the Backend Server
```bash
python app.py
```

You should see output like:
```
Loading ML models...
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment.
 * Running on http://127.0.0.1:5000
```

## Troubleshooting

### If you get "ModuleNotFoundError"
Install missing packages:
```bash
pip install flask flask-cors python-dotenv
```

### If you get Supabase errors
The backend will still work! It will return empty data gracefully.
Make sure your `.env` file has:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GEE_PROJECT_ID=your_gee_project_id
```

### Check if Backend is Running
Open a browser and go to: http://localhost:5000
You should see: `{"message": "Backend is running"}`

### Check API Stats Endpoint
Go to: http://localhost:5000/api/stats
You should see JSON data with stats (even if all zeros)

## Common Issues

1. **Port 5000 already in use**
   - Kill the process using port 5000
   - Or change the port in `app.py`: `app.run(debug=True, port=5001)`

2. **Backend crashes immediately**
   - Check the error message in the terminal
   - Run `python test_backend.py` to diagnose import issues

3. **CORS errors in browser**
   - Make sure `flask-cors` is installed
   - Backend should have `CORS(app)` enabled (already done)
