from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class SupabaseClient:
    """Singleton Supabase client with lazy initialization"""
    _instance = None
    _client: Client = None
    _initialized = False
    _error = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseClient, cls).__new__(cls)
        return cls._instance
    
    def _initialize(self):
        """Initialize Supabase client"""
        if self._initialized:
            return
        
        self._initialized = True
            
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not url or not key:
            self._error = "Missing Supabase credentials (SUPABASE_URL or SUPABASE_SERVICE_KEY)"
            print(f"⚠ Warning: {self._error}")
            print("  Backend will run with limited functionality (no database)")
            return
        
        print(f"Connecting to Supabase: {url}")
        
        # Create client with minimal options to avoid compatibility issues
        try:
            self._client = create_client(
                supabase_url=url,
                supabase_key=key
            )
            print("✓ Supabase client initialized")
        except Exception as e:
            self._error = f"Error creating Supabase client: {e}"
            print(f"⚠ Warning: {self._error}")
            print("  Backend will run with limited functionality (no database)")
    
    @property
    def client(self) -> Client:
        """Get Supabase client instance"""
        if not self._initialized:
            self._initialize()
        
        if self._client is None:
            # Return a mock client that raises helpful errors
            raise ConnectionError(
                f"Supabase not available: {self._error}\n"
                "Please configure SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file"
            )
        
        return self._client
    
    @property
    def is_available(self) -> bool:
        """Check if Supabase is available"""
        if not self._initialized:
            self._initialize()
        return self._client is not None

# Global instance
_supabase_instance = None

def get_supabase() -> Client:
    """Get Supabase client (creates connection on first call)"""
    global _supabase_instance
    if _supabase_instance is None:
        _supabase_instance = SupabaseClient()
    return _supabase_instance.client

def is_supabase_available() -> bool:
    """Check if Supabase is configured and available"""
    global _supabase_instance
    if _supabase_instance is None:
        _supabase_instance = SupabaseClient()
    return _supabase_instance.is_available
