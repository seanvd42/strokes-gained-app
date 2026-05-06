"""
Garmin Connect service for fetching golf data
Enhanced with token caching and rate limit handling
"""
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import logging
import time
from datetime import datetime, timedelta

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
    GarthHTTPError = Exception  # Fallback for type hints

logger = logging.getLogger(__name__)

# Garmin API endpoints
_GCS = "/gcs-golfcommunity/api/v2"

# Token cache directory
TOKEN_CACHE_DIR = Path("/tmp/garmin_tokens")
TOKEN_CACHE_DIR.mkdir(exist_ok=True)


class GarminService:
    """Service for interacting with Garmin Connect Golf data"""
    
    def __init__(self):
        self.api: Optional[Garmin] = None
        self.authenticated = False
        self.email = None
        
    def _get_token_path(self, email: str) -> Path:
        """Get path to cached token file for user"""
        safe_email = email.replace("@", "_at_").replace(".", "_")
        return TOKEN_CACHE_DIR / f"garmin_{safe_email}.pickle"
    
    def _load_cached_session(self, email: str) -> bool:
        """
        Try to load cached Garmin session tokens using the same pattern as garmin_fetch.py
        
        Returns:
            True if tokens loaded and valid, False otherwise
        """
        # Check if token directory has any .json files (garth saves tokens as JSON)
        token_files = list(TOKEN_CACHE_DIR.glob("*.json"))
        if not token_files:
            logger.info("No cached tokens found")
            return False
        
        try:
            # Try to login with cached tokens (garmin_fetch.py pattern)
            # First try passing token directory path
            try:
                self.api = Garmin()
                self.api.login(str(TOKEN_CACHE_DIR))
                logger.info("Loaded cached session with token directory")
            except TypeError:
                # Fallback: try login() with no args (auto-loads from default location)
                self.api = Garmin()
                self.api.login()
                logger.info("Loaded cached session with default login")
            
            # Verify session works
            try:
                self.api.get_user_summary(datetime.now().isoformat())
                self.authenticated = True
                self.email = email
                logger.info(f"Successfully using cached Garmin session for {email}")
                return True
            except Exception as verify_error:
                logger.warning(f"Cached session invalid: {verify_error}")
                # Clear old tokens
                for token_file in token_files:
                    token_file.unlink()
                return False
            
        except (FileNotFoundError, GarthHTTPError, Exception) as e:
            logger.warning(f"Failed to load cached session: {e}")
            # Clear old tokens
            for token_file in TOKEN_CACHE_DIR.glob("*.json"):
                try:
                    token_file.unlink()
                except:
                    pass
            return False
    
    def _save_session(self, email: str):
        """Save Garmin session tokens to cache"""
        try:
            # Use garth's dump method to save tokens to directory
            self.api.garth.dump(str(TOKEN_CACHE_DIR))
            logger.info(f"Saved session tokens for {email} to {TOKEN_CACHE_DIR}")
        except AttributeError:
            # Fallback for older garminconnect versions
            try:
                self.api.garth_client.dump(str(TOKEN_CACHE_DIR))
                logger.info(f"Saved session tokens (via garth_client) for {email}")
            except Exception as e:
                logger.warning(f"Failed to save session: {e}")
    
    def authenticate(self, email: str, password: str) -> bool:
        """
        Authenticate with Garmin Connect (uses cached tokens if available)
        
        Args:
            email: Garmin Connect email
            password: Garmin Connect password
            
        Returns:
            True if authentication successful
        """
        if not GARMIN_AVAILABLE:
            raise ImportError("garminconnect package not installed")
        
        # Try to use cached session first
        if self._load_cached_session(email):
            logger.info("Using cached Garmin session")
            return True
        
        # Fresh login required
        try:
            logger.info(f"Performing fresh Garmin login for: {email}")
            
            # Add retry logic for rate limiting
            max_retries = 3
            retry_delay = 2
            
            for attempt in range(max_retries):
                try:
                    # Create fresh Garmin instance for each attempt
                    self.api = Garmin(email=email, password=password, is_cn=False)
                    self.api.login()
                    
                    self.authenticated = True
                    self.email = email
                    
                    # Save session for future use
                    self._save_session(email)
                    
                    logger.info(f"Successfully authenticated with Garmin Connect: {email}")
                    return True
                    
                except (GarminConnectTooManyRequestsError, GarthHTTPError) as e:
                    # Check if it's a 429 error
                    error_str = str(e)
                    if "429" in error_str or "Too Many Requests" in error_str:
                        if attempt < max_retries - 1:
                            wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                            logger.warning(f"Rate limited (429), waiting {wait_time}s before retry {attempt+1}/{max_retries}")
                            time.sleep(wait_time)
                            # Will create fresh Garmin instance on next loop iteration
                            continue
                        else:
                            raise ValueError("Garmin rate limit exceeded. Your IP has been temporarily blocked by Garmin. Please wait 15-30 minutes before trying again.")
                    else:
                        raise
                        
        except GarminConnectAuthenticationError as e:
            logger.error(f"Garmin authentication failed: {e}")
            self.authenticated = False
            raise ValueError("Invalid Garmin credentials")
        except Exception as e:
            logger.error(f"Garmin authentication error: {type(e).__name__}: {e}", exc_info=True)
            self.authenticated = False
            raise
    
    def _connectapi_with_retry(self, path: str, max_retries: int = 3, **params) -> Dict:
        """
        Call Garmin Connect API with retry logic for rate limiting
        
        Args:
            path: API endpoint path
            max_retries: Maximum number of retry attempts
            **params: Query parameters
            
        Returns:
            API response dict
        """
        if not self.authenticated or not self.api:
            raise ValueError("Not authenticated with Garmin Connect")
        
        for attempt in range(max_retries):
            try:
                return self.api.connectapi(path, params=params)
            except GarminConnectTooManyRequestsError:
                if attempt < max_retries - 1:
                    wait_time = 2 ** (attempt + 1)  # 2, 4, 8 seconds
                    logger.warning(f"Rate limited, waiting {wait_time}s before retry {attempt+1}/{max_retries}")
                    time.sleep(wait_time)
                else:
                    raise ValueError("Garmin API rate limit exceeded. Please wait a few minutes and try again.")
            except Exception as e:
                if "429" in str(e) or "Too Many Requests" in str(e):
                    if attempt < max_retries - 1:
                        wait_time = 2 ** (attempt + 1)
                        logger.warning(f"Rate limited (429), waiting {wait_time}s before retry {attempt+1}/{max_retries}")
                        time.sleep(wait_time)
                    else:
                        raise ValueError("Garmin API rate limit exceeded. Please wait a few minutes and try again.")
                else:
                    raise
    
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
            summaries = self._connectapi_with_retry(
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
            return self._connectapi_with_retry(
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
                # Add small delay between hole requests to avoid rate limiting
                time.sleep(0.2)
                
                result = self._connectapi_with_retry(
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
                time.sleep(0.1)  # Small delay between club requests
                result = self._connectapi_with_retry(f"{_GCS}/club/{cid}")
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
        
        # Add delay between major API calls
        time.sleep(0.5)
        
        scorecard = self.fetch_scorecard_detail(scorecard_id)
        
        time.sleep(0.5)
        
        shots = self.fetch_shot_data(scorecard_id, scorecard)
        
        # Collect unique club IDs
        club_ids = list({
            s["clubId"]
            for h in (shots or {}).get("holes", [])
            for s in h.get("shots", [])
            if s.get("clubId")
        })
        
        time.sleep(0.5)
        
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
                
                # Add delay between rounds to avoid rate limiting
                if len(rounds) < count:
                    time.sleep(1)
                    
            except Exception as e:
                logger.error(f"Failed to fetch round {activity_id}: {e}")
        
        return rounds


# Singleton instance
garmin_service = GarminService()
