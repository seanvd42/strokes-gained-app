"""
Garmin Connect service for fetching golf data
Based on the golf strokes gained toolkit garmin_fetch.py
"""
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import logging

try:
    from garminconnect import (
        Garmin,
        GarminConnectAuthenticationError,
        GarminConnectConnectionError,
        GarminConnectTooManyRequestsError,
    )
    from garth.exc import GarthHTTPError
    GARMIN_AVAILABLE = True
except ImportError:
    GARMIN_AVAILABLE = False

logger = logging.getLogger(__name__)

# Garmin API endpoints
_GCS = "/gcs-golfcommunity/api/v2"


class GarminService:
    """Service for interacting with Garmin Connect Golf data"""
    
    def __init__(self):
        self.api: Optional[Garmin] = None
        self.authenticated = False
        
    def authenticate(self, email: str, password: str) -> bool:
        """
        Authenticate with Garmin Connect
        
        Args:
            email: Garmin Connect email
            password: Garmin Connect password
            
        Returns:
            True if authentication successful
        """
        if not GARMIN_AVAILABLE:
            raise ImportError("garminconnect package not installed")
            
        try:
            self.api = Garmin(email=email, password=password, is_cn=False)
            login_result = self.api.login()
            
            # Handle MFA if needed (not implemented in web version)
            if isinstance(login_result, tuple):
                result1, _ = login_result
                if result1 == "needs_mfa":
                    raise GarminConnectAuthenticationError("MFA required - not supported in web version")
            
            self.authenticated = True
            logger.info(f"Successfully authenticated with Garmin Connect: {email}")
            return True
            
        except GarminConnectAuthenticationError as e:
            logger.error(f"Garmin authentication failed: {e}")
            self.authenticated = False
            raise ValueError("Invalid Garmin credentials")
        except Exception as e:
            logger.error(f"Garmin authentication error: {e}")
            self.authenticated = False
            raise
    
    def _connectapi(self, path: str, **params) -> Dict:
        """Helper to call Garmin Connect API"""
        if not self.authenticated or not self.api:
            raise ValueError("Not authenticated with Garmin Connect")
        return self.api.connectapi(path, params=params)
    
    def fetch_golf_activities(self, limit: int = 100) -> List[Dict]:
        """
        Fetch golf activities list
        
        Args:
            limit: Maximum number of activities to fetch
            
        Returns:
            List of golf activity summaries
        """
        logger.info(f"Fetching golf activity list (limit={limit})")
        
        try:
            activities = self.api.get_activities_by_date(
                startdate=None, enddate=None, activitytype="golf", limit=limit
            )
            return activities or []
        except Exception as e:
            logger.warning(f"Direct golf filter failed ({e}), searching all activities")
            all_acts = self.api.get_activities(0, limit * 3) or []
            return [a for a in all_acts if
                    str(a.get("activityType", {}).get("typeKey", "")).lower() == "golf" or
                    "golf" in str(a.get("activityName", "")).lower()]
    
    def fetch_scorecard_id(self, activity_id: str, activity_date: str) -> Tuple[str, str]:
        """
        Resolve activity ID to scorecard ID
        
        Args:
            activity_id: Garmin activity ID
            activity_date: Activity date (YYYY-MM-DD)
            
        Returns:
            Tuple of (scorecard_id, course_name)
        """
        try:
            summaries = self._connectapi(
                f"{_GCS}/scorecard/summary",
                **{"per-page": 100, "user-locale": "en"},
            )
            sc_list = (summaries or {}).get("scorecardSummaries", [])
            
            # Match by activity ID
            for s in sc_list:
                if str(s.get("activityId")) == str(activity_id):
                    return str(s["id"]), s.get("courseName", "")
            
            # Fallback: match by date
            clean_date = str(activity_date)[:10]
            for s in sc_list:
                if str(s.get("startTime", ""))[:10] == clean_date:
                    logger.info(f"Matched scorecard by date: {clean_date} → ID {s['id']}")
                    return str(s["id"]), s.get("courseName", "")
                    
        except Exception as e:
            logger.warning(f"Scorecard summary lookup failed: {e}")
        
        # Last resort: use activity_id as scorecard_id
        logger.info(f"Using activity ID as scorecard ID: {activity_id}")
        return str(activity_id), ""
    
    def fetch_scorecard_detail(self, scorecard_id: str) -> Optional[Dict]:
        """Fetch full scorecard details"""
        try:
            return self._connectapi(
                f"{_GCS}/scorecard/detail",
                **{"scorecard-ids": scorecard_id, "include-longest-shot-distance": "true"},
            )
        except Exception as e:
            logger.warning(f"Scorecard fetch failed: {e}")
            return None
    
    def fetch_shot_data(self, scorecard_id: str, scorecard: Optional[Dict]) -> Dict:
        """
        Fetch shot-by-shot data for a round
        
        Args:
            scorecard_id: Scorecard ID
            scorecard: Scorecard detail (to determine hole numbers)
            
        Returns:
            Dict with hole shot data
        """
        # Extract hole numbers from scorecard
        hole_numbers = list(range(1, 19))  # Default to 18
        if scorecard:
            sc_details = scorecard.get("scorecardDetails") or []
            inner_sc = (sc_details[0].get("scorecard") or {}) if sc_details else {}
            holes_data = inner_sc.get("holes") or []
            if holes_data:
                hole_numbers = [h.get("number") or h.get("holeNumber")
                               for h in holes_data if h.get("number") or h.get("holeNumber")]
        
        all_hole_shots = []
        for hole_num in hole_numbers:
            try:
                result = self._connectapi(
                    f"{_GCS}/shot/scorecard/{scorecard_id}/hole",
                    **{"hole-numbers": hole_num, "image-size": "IMG_730X730"},
                )
                hole_shots = (result or {}).get("holeShots", [])
                if hole_shots:
                    all_hole_shots.append(hole_shots[0])
            except Exception as e:
                if "400" not in str(e):
                    logger.warning(f"Shot fetch failed for hole {hole_num}: {e}")
        
        return {"holes": all_hole_shots}
    
    def fetch_clubs(self, club_ids: List[int]) -> Dict[int, str]:
        """
        Resolve club IDs to names
        
        Args:
            club_ids: List of club IDs to resolve
            
        Returns:
            Dict mapping club ID to club name
        """
        club_map = {}
        if not club_ids:
            return club_map
        
        logger.info(f"Resolving {len(club_ids)} club IDs")
        for cid in club_ids:
            try:
                result = self._connectapi(f"{_GCS}/club/{cid}")
                if result:
                    name = (result.get("name") or result.get("clubName") or
                            result.get("gearTypeName") or result.get("type") or "")
                    if name:
                        club_map[int(cid)] = name
            except Exception:
                pass  # Unknown club - will show numeric ID
        
        found = len(club_map)
        logger.info(f"Resolved {found}/{len(club_ids)} club names")
        return club_map
    
    def fetch_round_detail(self, activity_id: str, activity_date: str,
                          activity_name: str = "") -> Dict:
        """
        Fetch complete round data
        
        Args:
            activity_id: Garmin activity ID
            activity_date: Activity date
            activity_name: Activity name
            
        Returns:
            Complete round data with scorecard, shots, and club info
        """
        logger.info(f"Fetching round detail for activity {activity_id}")
        
        scorecard_id, course_name = self.fetch_scorecard_id(activity_id, activity_date)
        logger.info(f"Scorecard ID: {scorecard_id}")
        
        scorecard = self.fetch_scorecard_detail(scorecard_id)
        shots = self.fetch_shot_data(scorecard_id, scorecard)
        
        # Collect unique club IDs
        club_ids = list({
            s["clubId"]
            for h in (shots or {}).get("holes", [])
            for s in h.get("shots", [])
            if s.get("clubId")
        })
        clubs = self.fetch_clubs(club_ids)
        
        final_name = activity_name or course_name or activity_id
        
        return {
            "activityId": activity_id,
            "scorecardId": scorecard_id,
            "activityName": final_name,
            "startTimeLocal": "",  # Will be filled by caller
            "scorecard": scorecard,
            "shots": shots,
            "clubs": clubs,
        }
    
    def fetch_recent_rounds(self, count: int = 5) -> List[Dict]:
        """
        Fetch recent golf rounds
        
        Args:
            count: Number of recent rounds to fetch
            
        Returns:
            List of round data
        """
        activities = self.fetch_golf_activities(limit=count)
        
        if not activities:
            logger.info("No golf activities found")
            return []
        
        logger.info(f"Found {len(activities)} golf round(s)")
        
        rounds = []
        for activity in activities[:count]:
            activity_id = activity.get("activityId")
            activity_name = activity.get("activityName", "")
            date_str = str(activity.get("startTimeLocal") or "")[:10]
            
            logger.info(f"Fetching: {date_str} — {activity_name} (id={activity_id})")
            
            try:
                detail = self.fetch_round_detail(activity_id, date_str, activity_name)
                detail["startTimeLocal"] = activity.get("startTimeLocal") or ""
                rounds.append(detail)
            except Exception as e:
                logger.error(f"Failed to fetch round {activity_id}: {e}")
        
        return rounds


# Singleton instance
garmin_service = GarminService()
