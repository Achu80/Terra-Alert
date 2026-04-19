import sys
import os

# Add parent directory to path so we can import from database package
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

def test_connection():
    """Test Supabase connection and verify tables"""
    
    print("=" * 60)
    print("SUPABASE CONNECTION TEST")
    print("=" * 60)
    
    # Step 1: Check credentials
    print("\n[1/5] Checking credentials...")
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not url or not key:
        print("   ✗ Missing credentials in .env file")
        print("\n   Please add to backend/.env:")
        print("   SUPABASE_URL=https://your-project.supabase.co")
        print("   SUPABASE_SERVICE_KEY=your-service-role-key")
        return False
    
    print(f"   ✓ SUPABASE_URL: {url}")
    print(f"   ✓ SUPABASE_SERVICE_KEY: {key[:20]}...{key[-10:]}")
    
    # Step 2: Import and initialize client
    print("\n[2/5] Initializing Supabase client...")
    try:
        from database.supabase_client import get_supabase
        supabase = get_supabase()
        print("   ✓ Client initialized successfully")
    except Exception as e:
        print(f"   ✗ Failed to initialize client: {e}")
        return False
    
    # Step 3: Test districts table
    print("\n[3/5] Testing districts table...")
    try:
        result = supabase.table('districts').select('*').limit(1).execute()
        print(f"   ✓ Districts table accessible ({len(result.data)} records)")
    except Exception as e:
        print(f"   ✗ Error accessing districts table: {e}")
        print("   → Did you run the schema SQL in Supabase SQL Editor?")
        return False
    
    # Step 4: Test settings table
    print("\n[4/5] Testing settings table...")
    try:
        result = supabase.table('settings').select('*').execute()
        print(f"   ✓ Settings table accessible ({len(result.data)} records)")
        if len(result.data) > 0:
            print(f"   → Default settings: {result.data[0]}")
    except Exception as e:
        print(f"   ✗ Error accessing settings table: {e}")
        return False
    
    # Step 5: Test other tables
    print("\n[5/5] Testing other tables...")
    try:
        tables = ['alerts', 'risk_history']
        for table in tables:
            result = supabase.table(table).select('*').limit(1).execute()
            print(f"   ✓ {table} table accessible ({len(result.data)} records)")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return False
    
    # Success!
    print("\n" + "=" * 60)
    print("✓ ALL TESTS PASSED!")
    print("=" * 60)
    print("\nYour Supabase database is ready to use.")
    print("\nNext steps:")
    print("1. Import district GeoJSON data")
    print("2. Update API routes to use Supabase")
    print("3. Test with GEE integration")
    
    return True

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
