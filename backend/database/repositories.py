"""
Database repositories for TerraAlert
Handles all database operations for districts, alerts, history, and settings
"""
from typing import List, Dict, Optional, Any
from datetime import datetime
from database.supabase_client import get_supabase, is_supabase_available
import json


class DistrictRepository:
    """Repository for district operations"""
    
    def __init__(self):
        try:
            if is_supabase_available():
                self.supabase = get_supabase()
            else:
                self.supabase = None
        except Exception as e:
            print(f"Warning: Could not initialize Supabase in DistrictRepository: {e}")
            self.supabase = None
    
    def get_all(self) -> List[Dict]:
        """Get all districts with current risk data"""
        if not self.supabase:
            return []
        try:
            result = self.supabase.table('districts').select('*').execute()
            return result.data
        except Exception as e:
            print(f"Error in get_all: {e}")
            return []
    
    def get_by_id(self, district_id: str) -> Optional[Dict]:
        """Get single district by district_id"""
        if not self.supabase:
            return None
        try:
            result = self.supabase.table('districts')\
                .select('*')\
                .eq('district_id', district_id)\
                .execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error in get_by_id: {e}")
            return None
    
    def get_highest_risk_district(self) -> Optional[Dict]:
        """Get district with highest risk score"""
        if not self.supabase:
            return None
        try:
            result = self.supabase.table('districts')\
                .select('*')\
                .order('risk_score', desc=True)\
                .limit(1)\
                .execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error in get_highest_risk_district: {e}")
            return None
    
    def create(self, district_data: Dict) -> Dict:
        """Create new district"""
        if not self.supabase:
            raise ConnectionError("Supabase not available")
        result = self.supabase.table('districts').insert(district_data).execute()
        return result.data[0]
    
    def update(self, district_id: str, updates: Dict) -> Dict:
        """Update district data"""
        if not self.supabase:
            raise ConnectionError("Supabase not available")
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
        try:
            if is_supabase_available():
                self.supabase = get_supabase()
            else:
                self.supabase = None
        except Exception as e:
            print(f"Warning: Could not initialize Supabase in RiskHistoryRepository: {e}")
            self.supabase = None
    
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
    
    def get_recent_predictions(self, limit: int = 8) -> List[Dict]:
        """Get recent predictions with location info"""
        if not self.supabase:
            return []
        try:
            result = self.supabase.table('risk_history')\
                .select('*')\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            predictions = []
            for item in result.data:
                try:
                    # Extract lat/lon from district_id if it's a location-based prediction
                    district_id = item.get('district_id', '')
                    lat, lon = 31.1048, 77.1734  # Default to Shimla, HP
                    location_name = district_id
                    
                    # Check if it's a location-based prediction (format: loc_31.1048_77.1734)
                    if district_id.startswith('loc_'):
                        try:
                            parts = district_id.replace('loc_', '').split('_')
                            if len(parts) >= 2:
                                lat = float(parts[0])
                                lon = float(parts[1])
                        except:
                            pass
                    
                    # Try to get location name from features
                    features = item.get('features', {})
                    if features and isinstance(features, dict):
                        if 'location_name' in features:
                            location_name = features['location_name']
                        else:
                            location_name = f"({lat:.4f}, {lon:.4f})"
                    else:
                        location_name = f"({lat:.4f}, {lon:.4f})"
                    
                    # Calculate time ago
                    created_at = datetime.fromisoformat(item['created_at'].replace('Z', '+00:00'))
                    time_diff = datetime.utcnow().replace(tzinfo=created_at.tzinfo) - created_at
                    
                    if time_diff.total_seconds() < 3600:
                        ts = f"{int(time_diff.total_seconds() / 60)} min ago"
                    elif time_diff.total_seconds() < 86400:
                        ts = f"{int(time_diff.total_seconds() / 3600)} hr ago"
                    else:
                        ts = f"{int(time_diff.days)} days ago"
                    
                    # Get top factor from features
                    top_factor = "N/A"
                    if features and isinstance(features, dict):
                        # Find highest value feature (excluding certain fields)
                        exclude_keys = ['lat', 'lon', 'location_key', 'district_id', 'location_name']
                        numeric_features = {
                            k: v for k, v in features.items() 
                            if isinstance(v, (int, float)) and k not in exclude_keys
                        }
                        if numeric_features:
                            # Get feature with highest absolute value
                            max_key = max(numeric_features, key=lambda k: abs(numeric_features[k]))
                            value = numeric_features[max_key]
                            # Format nicely
                            if isinstance(value, float):
                                top_factor = f"{max_key}: {value:.2f}"
                            else:
                                top_factor = f"{max_key}: {value}"
                    
                    predictions.append({
                        'id': item.get('id', ''),
                        'lat': lat,
                        'lon': lon,
                        'score': round(item.get('risk_score', 0), 1),
                        'level': item.get('risk_level', 'LOW'),
                        'top_factor': top_factor,
                        'ts': ts,
                        'location': location_name,
                        'created_at': item.get('created_at', ''),
                        # Add feature data for export
                        'elevation': round(features.get('elevation', 0), 1) if features else 0,
                        'slope': round(features.get('slope', 0), 1) if features else 0,
                        'aspect': round(features.get('aspect', 0), 1) if features else 0,
                        'ndvi': round(features.get('ndvi', 0), 3) if features else 0,
                        'ndwi': round(features.get('ndwi', 0), 3) if features else 0,
                        'soil_type': int(features.get('soil_type', 0)) if features else 0,
                        'rainfall_3d': round(features.get('rainfall_3d', 0), 1) if features else 0,
                        'rainfall_7d': round(features.get('rainfall_7d', 0), 1) if features else 0,
                        'rainfall_14d': round(features.get('rainfall_14d', 0), 1) if features else 0,
                        'rainfall_30d': round(features.get('rainfall_30d', 0), 1) if features else 0,
                        'confidence': round(item.get('confidence', 85), 1)
                    })
                except Exception as e:
                    print(f"Error processing prediction item: {e}")
                    continue
            
            return predictions
        except Exception as e:
            print(f"Error in get_recent_predictions: {e}")
            return []
    
    def get_7day_trend(self) -> List[Dict]:
        """Get average risk score for last 7 days"""
        if not self.supabase:
            return []
        try:
            from datetime import timedelta
            
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=7)
            
            result = self.supabase.table('risk_history')\
                .select('date, risk_score')\
                .gte('date', start_date.isoformat())\
                .order('date', desc=False)\
                .execute()
            
            # Group by day and calculate average
            daily_scores = {}
            for item in result.data:
                try:
                    date_obj = datetime.fromisoformat(item['date'].replace('Z', '+00:00'))
                    day_key = date_obj.strftime('%b %d')
                    
                    if day_key not in daily_scores:
                        daily_scores[day_key] = []
                    daily_scores[day_key].append(item['risk_score'])
                except Exception as e:
                    print(f"Error processing trend item: {e}")
                    continue
            
            # Calculate averages for last 7 days
            trend = []
            for i in range(7):
                date = end_date - timedelta(days=6-i)
                day_key = date.strftime('%b %d')
                
                if day_key in daily_scores:
                    avg = sum(daily_scores[day_key]) / len(daily_scores[day_key])
                else:
                    avg = 0
                
                trend.append({
                    'date': day_key,
                    'avg': round(avg, 1)
                })
            
            return trend
        except Exception as e:
            print(f"Error in get_7day_trend: {e}")
            return []
    
    def get_all_predictions(self, limit: int = 100) -> List[Dict]:
        """Get all predictions with pagination"""
        if not self.supabase:
            return []
        try:
            result = self.supabase.table('risk_history')\
                .select('*')\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data
        except Exception as e:
            print(f"Error in get_all_predictions: {e}")
            return []
    
    def get_predictions_by_risk_level(self, level: str) -> List[Dict]:
        """Get predictions filtered by risk level"""
        if not self.supabase:
            return []
        try:
            result = self.supabase.table('risk_history')\
                .select('*')\
                .eq('risk_level', level)\
                .order('created_at', desc=True)\
                .execute()
            
            return result.data
        except Exception as e:
            print(f"Error in get_predictions_by_risk_level: {e}")
            return []
    
    def get_prediction_stats(self) -> Dict:
        """Get statistics about all predictions"""
        if not self.supabase:
            return {
                'total': 0,
                'critical': 0,
                'high': 0,
                'moderate': 0,
                'low': 0,
                'avg_score': 0
            }
        try:
            result = self.supabase.table('risk_history')\
                .select('risk_level, risk_score')\
                .execute()
            
            data = result.data
            total = len(data)
            
            if total == 0:
                return {
                    'total': 0,
                    'critical': 0,
                    'high': 0,
                    'moderate': 0,
                    'low': 0,
                    'avg_score': 0
                }
            
            critical = sum(1 for d in data if d.get('risk_level') == 'CRITICAL')
            high = sum(1 for d in data if d.get('risk_level') == 'HIGH')
            moderate = sum(1 for d in data if d.get('risk_level') == 'MODERATE')
            low = sum(1 for d in data if d.get('risk_level') == 'LOW')
            avg_score = sum(d.get('risk_score', 0) for d in data) / total
            
            return {
                'total': total,
                'critical': critical,
                'high': high,
                'moderate': moderate,
                'low': low,
                'avg_score': round(avg_score, 1)
            }
        except Exception as e:
            print(f"Error in get_prediction_stats: {e}")
            return {
                'total': 0,
                'critical': 0,
                'high': 0,
                'moderate': 0,
                'low': 0,
                'avg_score': 0
            }


class AlertRepository:
    """Repository for alert operations"""
    
    def __init__(self):
        try:
            if is_supabase_available():
                self.supabase = get_supabase()
            else:
                self.supabase = None
        except Exception as e:
            print(f"Warning: Could not initialize Supabase in AlertRepository: {e}")
            self.supabase = None
    
    def create_alert(self, district_id: str, level: str, score: float, 
                    trigger: str) -> Dict:
        """Create new alert"""
        if not self.supabase:
            raise ConnectionError("Supabase not available")
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
        if not self.supabase:
            return []
        try:
            query = self.supabase.table('alerts')\
                .select('*')\
                .order('created_at', desc=True)\
                .limit(limit)
            
            if level:
                query = query.eq('level', level)
            
            result = query.execute()
            return result.data
        except Exception as e:
            print(f"Error in get_recent_alerts: {e}")
            return []
    
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
        try:
            if is_supabase_available():
                self.supabase = get_supabase()
            else:
                self.supabase = None
        except Exception as e:
            print(f"Warning: Could not initialize Supabase in SettingsRepository: {e}")
            self.supabase = None
    
    def get_settings(self) -> Dict:
        """Get current settings"""
        if not self.supabase:
            # Return defaults if Supabase not available
            return {
                'thresholds': {'critical': 80, 'high': 60, 'moderate': 40},
                'weights': {'rf': 0.4, 'adaboost': 0.3, 'bagging': 0.3},
                'refresh_interval': 15,
                'notifications': {'email': False, 'digest': False, 'retrain': False}
            }
        try:
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
        except Exception as e:
            print(f"Error in get_settings: {e}")
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
        try:
            if is_supabase_available():
                self.supabase = get_supabase()
            else:
                self.supabase = None
        except Exception as e:
            print(f"Warning: Could not initialize Supabase in StatsRepository: {e}")
            self.supabase = None
    
    def get_dashboard_stats(self) -> Dict:
        """Get dashboard statistics"""
        if not self.supabase:
            return {
                'total_districts': 0,
                'critical_count': 0,
                'high_count': 0,
                'moderate_count': 0,
                'low_count': 0,
                'avg_risk_score': 0,
                'last_refresh': None
            }
        try:
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
        except Exception as e:
            print(f"Error in get_dashboard_stats: {e}")
            return {
                'total_districts': 0,
                'critical_count': 0,
                'high_count': 0,
                'moderate_count': 0,
                'low_count': 0,
                'avg_risk_score': 0,
                'last_refresh': None
            }
    
    def get_score_distribution(self) -> List[Dict]:
        """Get risk score distribution in ranges"""
        if not self.supabase:
            return [
                {'range': '0–20', 'count': 0},
                {'range': '21–40', 'count': 0},
                {'range': '41–60', 'count': 0},
                {'range': '61–80', 'count': 0},
                {'range': '81–100', 'count': 0}
            ]
        try:
            districts = self.supabase.table('districts').select('risk_score').execute()
            
            ranges = {
                '0–20': 0,
                '21–40': 0,
                '41–60': 0,
                '61–80': 0,
                '81–100': 0
            }
            
            for d in districts.data:
                score = d.get('risk_score', 0)
                if score <= 20:
                    ranges['0–20'] += 1
                elif score <= 40:
                    ranges['21–40'] += 1
                elif score <= 60:
                    ranges['41–60'] += 1
                elif score <= 80:
                    ranges['61–80'] += 1
                else:
                    ranges['81–100'] += 1
            
            return [{'range': k, 'count': v} for k, v in ranges.items()]
        except Exception as e:
            print(f"Error in get_score_distribution: {e}")
            return [
                {'range': '0–20', 'count': 0},
                {'range': '21–40', 'count': 0},
                {'range': '41–60', 'count': 0},
                {'range': '61–80', 'count': 0},
                {'range': '81–100', 'count': 0}
            ]
    
    def get_total_predictions(self) -> int:
        """Get total number of predictions made"""
        if not self.supabase:
            return 0
        try:
            result = self.supabase.table('risk_history').select('id', count='exact').execute()
            return result.count if result.count else 0
        except Exception as e:
            print(f"Error in get_total_predictions: {e}")
            return 0
