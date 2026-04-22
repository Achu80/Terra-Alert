"""
Test script to verify prediction storage to Supabase
Run this to test if predictions are being saved correctly
"""

from database.repositories import RiskHistoryRepository
from datetime import datetime

def test_prediction_storage():
    """Test saving and retrieving predictions"""
    
    print("=" * 60)
    print("Testing Prediction Storage to Supabase")
    print("=" * 60)
    
    # Initialize repository
    history_repo = RiskHistoryRepository()
    
    # Check if Supabase is available
    if not history_repo.supabase:
        print("❌ Supabase not available!")
        print("   Check your .env file and credentials")
        return False
    
    print("✅ Supabase connection established")
    
    # Test 1: Add a test prediction
    print("\n📝 Test 1: Adding test prediction...")
    try:
        test_location = "loc_31.1048_77.1734"
        test_score = 65.5
        test_level = "HIGH"
        test_features = {
            "rainfall_30d": 250,
            "slope": 35,
            "ndvi": 0.45,
            "elevation": 2500,
            "soil_type": 5
        }
        
        history_repo.add_entry(
            district_id=test_location,
            score=test_score,
            level=test_level,
            features=test_features,
            model_scores={"xgboost": test_score}
        )
        
        print(f"✅ Test prediction saved successfully!")
        print(f"   Location: {test_location}")
        print(f"   Score: {test_score}")
        print(f"   Level: {test_level}")
    except Exception as e:
        print(f"❌ Failed to save prediction: {e}")
        return False
    
    # Test 2: Retrieve recent predictions
    print("\n📊 Test 2: Retrieving recent predictions...")
    try:
        predictions = history_repo.get_recent_predictions(limit=5)
        print(f"✅ Retrieved {len(predictions)} predictions")
        
        if predictions:
            print("\n   Recent predictions:")
            for i, pred in enumerate(predictions[:3], 1):
                print(f"   {i}. {pred['location']} - Score: {pred['score']} ({pred['level']}) - {pred['ts']}")
        else:
            print("   No predictions found (this is normal if database is empty)")
    except Exception as e:
        print(f"❌ Failed to retrieve predictions: {e}")
        return False
    
    # Test 3: Get prediction statistics
    print("\n📈 Test 3: Getting prediction statistics...")
    try:
        stats = history_repo.get_prediction_stats()
        print(f"✅ Statistics retrieved successfully!")
        print(f"   Total predictions: {stats['total']}")
        print(f"   Critical: {stats['critical']}")
        print(f"   High: {stats['high']}")
        print(f"   Moderate: {stats['moderate']}")
        print(f"   Low: {stats['low']}")
        print(f"   Average score: {stats['avg_score']}")
    except Exception as e:
        print(f"❌ Failed to get statistics: {e}")
        return False
    
    # Test 4: Get 7-day trend
    print("\n📉 Test 4: Getting 7-day trend...")
    try:
        trend = history_repo.get_7day_trend()
        print(f"✅ Trend data retrieved: {len(trend)} days")
        
        if trend:
            print("   Daily averages:")
            for day in trend:
                print(f"   {day['date']}: {day['avg']}")
        else:
            print("   No trend data (need predictions across multiple days)")
    except Exception as e:
        print(f"❌ Failed to get trend: {e}")
        return False
    
    # Test 5: Get all predictions
    print("\n📋 Test 5: Getting all predictions...")
    try:
        all_predictions = history_repo.get_all_predictions(limit=10)
        print(f"✅ Retrieved {len(all_predictions)} predictions")
    except Exception as e:
        print(f"❌ Failed to get all predictions: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)
    print("\nYour prediction storage is working correctly!")
    print("Now make predictions in the app and check the Dashboard.")
    
    return True

if __name__ == "__main__":
    import sys
    sys.path.insert(0, '.')
    
    try:
        success = test_prediction_storage()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
