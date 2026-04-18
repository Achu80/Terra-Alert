from services.gee_service import GEEService
from utils.data_processor import DataProcessor
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize services
project_id = os.getenv('GEE_PROJECT_ID')
print(f"Using GEE Project ID: {project_id}")
gee = GEEService(project_id=project_id)
processor = DataProcessor()

# Test coordinates (example: agricultural area)
lat = 40.7128
lon = -74.0060

# Date range (last 30 days)
end_date = datetime.now()
start_date = end_date - timedelta(days=30)

print("Testing GEE connection...")
print(f"Location: {lat}, {lon}")
print(f"Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
print("-" * 50)

# Fetch data
try:
    data = gee.get_satellite_data(
        lat=lat,
        lon=lon,
        start_date=start_date.strftime('%Y-%m-%d'),
        end_date=end_date.strftime('%Y-%m-%d'),
        buffer=1000
    )
    
    if data:
        print("✓ GEE data fetched successfully!")
        print("\nRaw band values:")
        for key, value in data.items():
            print(f"  {key}: {value}")
        
        # Process data
        processed = processor.prepare_model_input(data)
        print("\n✓ Data processed for model input!")
        print(f"\nFeature names: {processed['feature_names']}")
        print(f"Feature values: {processed['features']}")
    else:
        print("✗ No data found for this location/date range")
        
except Exception as e:
    print(f"✗ Error: {e}")
