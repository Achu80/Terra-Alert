"""
Remove foreign key constraints from Supabase tables
Run this if you can't access Supabase dashboard
"""

from database.supabase_client import get_supabase
import sys

def remove_constraints():
    """Remove foreign key constraints via Python"""
    
    print("=" * 60)
    print("Removing Foreign Key Constraints")
    print("=" * 60)
    
    try:
        supabase = get_supabase()
        print("✅ Connected to Supabase")
        
        # SQL to remove constraints
        sql = """
        ALTER TABLE risk_history DROP CONSTRAINT IF EXISTS risk_history_district_id_fkey;
        ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_district_id_fkey;
        """
        
        print("\n📝 Executing SQL to remove constraints...")
        
        # Execute via RPC (if available) or direct query
        try:
            # Try using rpc
            result = supabase.rpc('exec_sql', {'sql': sql}).execute()
            print("✅ Constraints removed successfully!")
        except Exception as e:
            print(f"⚠️  RPC method not available: {e}")
            print("\n❌ Cannot remove constraints via Python client")
            print("\n📋 You need to run this SQL in Supabase Dashboard:")
            print("-" * 60)
            print(sql)
            print("-" * 60)
            print("\n🔗 Go to: https://supabase.com/dashboard/project/lwurspqlazvnaqcyzdwg/sql")
            print("   1. Click 'New Query'")
            print("   2. Paste the SQL above")
            print("   3. Click 'Run'")
            return False
        
        print("\n" + "=" * 60)
        print("✅ Success! Constraints removed.")
        print("=" * 60)
        print("\nNow run: python test_prediction_storage.py")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n📋 Please run this SQL manually in Supabase Dashboard:")
        print("-" * 60)
        print("""
ALTER TABLE risk_history DROP CONSTRAINT IF EXISTS risk_history_district_id_fkey;
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_district_id_fkey;
        """)
        print("-" * 60)
        print("\n🔗 Go to: https://supabase.com/dashboard/project/lwurspqlazvnaqcyzdwg/sql")
        return False

if __name__ == "__main__":
    success = remove_constraints()
    sys.exit(0 if success else 1)
