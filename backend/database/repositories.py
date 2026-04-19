"""
Database repositories for TerraAlert
Handles all database operations for districts, alerts, history, and settings
"""
from typing import List, Dict, Optional, Any
from datetime import datetime
from database.supabase_client import get_supabase
import json


class DistrictRepository:
    """Repository for district operations"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    def get_all(self) -> List[Dict]:
        """Get all districts with current risk data"""
        result = self.supabase.table('districts').select('*').execute()
        return result.data
    
    def get_by_id(self, district_id: str) -> Optional[Dict]:
        """Get single district by district_id"""
        result = self.supabase.table('districts')\
            .select('*')\
            .eq('district_id', district_id)\
            .execute()
        return result.data[0] if result.data else None
    
    def create(self, district_data: Dict) -> Dict:
        """Create new district"""
        result = self.supabase.table('districts').insert(district_data).execute()
        return result.data[0]
    
    def update(self, district_id: str, updates: Dict) -> Dict:
        """Update district data"""
        updates['last_updated'] = datetime.utcnow().isoformat()
        result = self.supabase.table('districts')\
            .update(updates)\
            .eq('district_id', district_id)\
            .execute()
        return result.data[0] if result.data else None
    
    def update_risk_score(self, district_id: str, score: float, level: str, 
                         features: Dict, model_scores: Dict, confidence: float):
        """Update district risk score and related data"""
        updates = {
            'risk_score': score,
            'risk_level': level,
            'features': features,
            'model_scores': model_scores,
            'confidence': confidence,
            'last_updated': datetime.utcnow().isoformat()
        }
        return self.update(district_id, updates)


class RiskHistoryRepository:
    """Repository for risk history operations"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    def add_entry(self, district_id: str, score: float, level: str, 
                  features: Dict, model_scores: Dict):
        """Add risk history entry"""
        entry = {
            'district_id': district_id,
            'date': datetime.utcnow().isoformat(),
            'risk_score': score,
            'risk_level': level,
            'features': features,
            'model_scores': model_scores
        }
        result = self.supabase.table('risk_history').insert(entry).execute()
        return result.data[0]
    
    def get_history(self, district_id: str, from_date: Optional[str] = None, 
                   to_date: Optional[str] = None) -> List[Dict]:
        """Get risk history for a district"""
        query = self.supabase.table('risk_history')\
            .select('*')\
            .eq('district_id', district_id)\
            .order('date', desc=True)
        
        if from_date:
            query = query.gte('date', from_date)
        if to_date:
            query = query.lte('date', to_date)
        
        result = query.execute()
        return result.data


class AlertRepository:
    """Repository for alert operations"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    def create_alert(self, district_id: str, level: str, score: float, 
                    trigger: str) -> Dict:
        """Create new alert"""
        alert = {
            'district_id': district_id,
            'level': level,
            'score': score,
            'trigger': trigger,
            'acknowledged': False
        }
        result = self.supabase.table('alerts').insert(alert).execute()
        return result.data[0]
    
    def get_recent_alerts(self, limit: int = 10, level: Optional[str] = None) -> List[Dict]:
        """Get recent alerts"""
        query = self.supabase.table('alerts')\
            .select('*')\
            .order('created_at', desc=True)\
            .limit(limit)
        
        if level:
            query = query.eq('level', level)
        
        result = query.execute()
        return result.data
    
    def acknowledge_alert(self, alert_id: str) -> Dict:
        """Mark alert as acknowledged"""
        result = self.supabase.table('alerts')\
            .update({'acknowledged': True})\
            .eq('id', alert_id)\
            .execute()
        return result.data[0] if result.data else None


class SettingsRepository:
    """Repository for settings operations"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    def get_settings(self) -> Dict:
        """Get current settings"""
        result = self.supabase.table('settings').select('*').limit(1).execute()
        if result.data:
            return result.data[0]
        # Return defaults if no settings exist
        return {
            'thresholds': {'critical': 80, 'high': 60, 'moderate': 40},
            'weights': {'rf': 0.4, 'adaboost': 0.3, 'bagging': 0.3},
            'refresh_interval': 15,
            'notifications': {'email': False, 'digest': False, 'retrain': False}
        }
    
    def update_settings(self, settings: Dict) -> Dict:
        """Update settings"""
        # Get existing settings
        existing = self.supabase.table('settings').select('id').limit(1).execute()
        
        if existing.data:
            # Update existing
            result = self.supabase.table('settings')\
                .update(settings)\
                .eq('id', existing.data[0]['id'])\
                .execute()
        else:
            # Create new
            result = self.supabase.table('settings').insert(settings).execute()
        
        return result.data[0] if result.data else None


class StatsRepository:
    """Repository for aggregate statistics"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    def get_dashboard_stats(self) -> Dict:
        """Get dashboard statistics"""
        # Use the dashboard_stats view
        result = self.supabase.table('dashboard_stats').select('*').execute()
        if result.data:
            return result.data[0]
        
        # Fallback: calculate manually
        districts = self.supabase.table('districts').select('*').execute()
        data = districts.data
        
        return {
            'total_districts': len(data),
            'critical_count': sum(1 for d in data if d.get('risk_level') == 'CRITICAL'),
            'high_count': sum(1 for d in data if d.get('risk_level') == 'HIGH'),
            'moderate_count': sum(1 for d in data if d.get('risk_level') == 'MODERATE'),
            'low_count': sum(1 for d in data if d.get('risk_level') == 'LOW'),
            'avg_risk_score': sum(d.get('risk_score', 0) for d in data) / len(data) if data else 0,
            'last_refresh': max((d.get('last_updated') for d in data), default=None)
        }
