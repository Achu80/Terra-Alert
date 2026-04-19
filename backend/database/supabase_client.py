from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class SupabaseClient:
    """Singleton Supabase client with lazy initialization"""
    _instance = None
    _client: Client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseClient, cls).__new__(cls)
        return cls._instance
    
    def _initialize(self):
        """Initialize Supabase client"""
        if self._client is not None:
            return
            
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not url or not key:
            raise ValueError(
                "Missing Supabase credentials!\n"
                "Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env file."
            )
        
        print(f"Connecting to Supabase: {url}")
        
        # Create client with minimal options to avoid compatibility issues
        try:
            self._client = create_client(
                supabase_url=url,
                supabase_key=key
            )
            print("✓ Supabase client initialized")
        except Exception as e:
            print(f"Error creating client: {e}")
            raise
    
    @property
    def client(self) -> Client:
        """Get Supabase client instance"""
        if self._client is None:
            self._initialize()
        return self._client

# Global instance
_supabase_instance = None

def get_supabase() -> Client:
    """Get Supabase client (creates connection on first call)"""
    global _supabase_instance
    if _supabase_instance is None:
        _supabase_instance = SupabaseClient()
    return _supabase_instance.client
