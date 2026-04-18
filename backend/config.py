import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration"""
    
    # Flask
    DEBUG = os.getenv('FLASK_DEBUG', 'True') == 'True'
    ENV = os.getenv('FLASK_ENV', 'development')
    
    # Google Earth Engine
    GEE_PROJECT_ID = os.getenv('GEE_PROJECT_ID')
    
    # Server
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
