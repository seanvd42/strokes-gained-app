"""
Database service for Supabase interactions
"""
from typing import List, Optional, Dict, Any
from datetime import date
from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class DatabaseService:
    """Service for database operations via Supabase"""
    
    def __init__(self):
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
    
    # Profile operations
    async def get_profile(self, user_id: str) -> Optional[Dict]:
        """Get user profile by ID"""
        try:
            response = self.client.table("profiles").select("*").eq("id", user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting profile: {e}")
            return None
    
    async def create_profile(self, user_id: str, email: str, name: Optional[str] = None) -> Dict:
        """Create new user profile"""
        try:
            data = {
                "id": user_id,
                "email": email,
                "name": name
            }
            response = self.client.table("profiles").insert(data).execute()
            return response.data[0]
        except Exception as e:
            logger.error(f"Error creating profile: {e}")
            raise
    
    async def update_profile(self, user_id: str, updates: Dict) -> Dict:
        """Update user profile"""
        try:
            response = self.client.table("profiles").update(updates).eq("id", user_id).execute()
            return response.data[0]
        except Exception as e:
            logger.error(f"Error updating profile: {e}")
            raise
    
    # Shot operations
    async def create_shot(self, shot_data: Dict) -> Dict:
        """Create a new shot record"""
        try:
            response = self.client.table("shots").insert(shot_data).execute()
            return response.data[0]
        except Exception as e:
            logger.error(f"Error creating shot: {e}")
            raise
    
    async def bulk_create_shots(self, shots_data: List[Dict]) -> List[Dict]:
        """Create multiple shot records"""
        try:
            response = self.client.table("shots").insert(shots_data).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error bulk creating shots: {e}")
            raise
    
    async def get_shots(
        self,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        benchmark: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict]:
        """Get shots for a user with optional filters"""
        try:
            query = self.client.table("shots").select("*").eq("user_id", user_id)
            
            if start_date:
                query = query.gte("shot_date", start_date.isoformat())
            if end_date:
                query = query.lte("shot_date", end_date.isoformat())
            if benchmark:
                query = query.eq("benchmark", benchmark)
            
            query = query.order("shot_date", desc=True).limit(limit)
            response = query.execute()
            return response.data
        except Exception as e:
            logger.error(f"Error getting shots: {e}")
            raise
    
    async def get_shot_by_id(self, shot_id: str, user_id: str) -> Optional[Dict]:
        """Get a specific shot by ID"""
        try:
            response = self.client.table("shots").select("*").eq("id", shot_id).eq("user_id", user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting shot: {e}")
            return None
    
    async def update_shot(self, shot_id: str, user_id: str, updates: Dict) -> Dict:
        """Update a shot record"""
        try:
            response = self.client.table("shots").update(updates).eq("id", shot_id).eq("user_id", user_id).execute()
            return response.data[0]
        except Exception as e:
            logger.error(f"Error updating shot: {e}")
            raise
    
    async def delete_shot(self, shot_id: str, user_id: str) -> bool:
        """Delete a shot record"""
        try:
            self.client.table("shots").delete().eq("id", shot_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting shot: {e}")
            return False
    
    async def delete_all_shots(self, user_id: str) -> bool:
        """Delete all shots for a user"""
        try:
            self.client.table("shots").delete().eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting all shots: {e}")
            return False


# Singleton instance
db_service = DatabaseService()
