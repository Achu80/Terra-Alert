#!/usr/bin/env python3
"""
Quick test script to check if backend can start
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

print("Testing backend imports...")

try:
    print("1. Loading environment...")
    from dotenv import load_dotenv
    load_dotenv()
    print("   ✓ Environment loaded")
    
    print("2. Importing Flask...")
    from flask import Flask
    print("   ✓ Flask imported")
    
    print("3. Importing CORS...")
    from flask_cors import CORS
    print("   ✓ CORS imported")
    
    print("4. Importing routes...")
    from routes.api_routes import api_bp
    print("   ✓ API routes imported")
    
    from routes.forecast_routes import forecast_bp
    print("   ✓ Forecast routes imported")
    
    print("5. Creating Flask app...")
    app = Flask(__name__)
    CORS(app)
    print("   ✓ Flask app created")
    
    print("6. Registering blueprints...")
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(forecast_bp, url_prefix='/api/forecast')
    print("   ✓ Blueprints registered")
    
    print("\n✅ All imports successful! Backend should start properly.")
    print("\nTo start the backend, run:")
    print("  python app.py")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    print("\nFull traceback:")
    traceback.print_exc()
    sys.exit(1)
