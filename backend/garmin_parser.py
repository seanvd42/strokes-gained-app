"""
Garmin data parser - converts Garmin API responses to standardized shot format
Based on parse_shots.py from the golf strokes gained toolkit
"""
from typing import Dict, List, Optional, Tuple
import math
import logging

logger = logging.getLogger(__name__)

# Distance threshold for treating shot as holed (yards)
HOLE_THRESHOLD_YARDS = 3.0

# Lie type normalization
LIE_ALIAS = {
    "teebox": "tee_box",
    "tee": "tee_box",
    "fairway": "fairway",
    "rough": "rough",
    "light rough": "rough",
    "heavy rough": "rough",
    "bunker": "sand",
    "sand": "sand",
    "greenside bunker": "sand",
    "recovery": "recovery",
    "trees": "recovery",
    "penalty": "rough",
    "water": "recovery",
    "ob": "rough",
    "green": "green",
    "fringe": "rough",
    "hole": "hole",
    "unknown": "rough",
}


def _ll(raw: int) -> float:
    """Convert Garmin lat/lon format to decimal degrees"""
    return raw / 1e7


def haversine_yards(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in yards"""
    R = 6_371_000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    a = (math.sin(math.radians(lat2 - lat1) / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    distance_meters = 2 * R * math.asin(math.sqrt(a))
    return round(distance_meters * 1.09361, 1)  # Convert to yards


def normalise_lie(raw: str) -> str:
    """Normalize lie type to standard format"""
    if not raw:
        return "unknown"
    key = raw.strip().lower()
    return LIE_ALIAS.get(key, key)


def extract_scorecard_meta(round_data: Dict) -> Tuple[str, str, Dict]:
    """
    Extract scorecard metadata from Garmin round data
    
    Returns:
        Tuple of (course_name, round_date, hole_metadata_dict)
    """
    sc_blob = round_data.get("scorecard") or {}
    details = sc_blob.get("scorecardDetails") or []
    inner_sc = (details[0].get("scorecard") or {}) if details else {}
    snap = (sc_blob.get("courseSnapshots") or [{}])[0]
    
    course_name = (snap.get("name") or inner_sc.get("courseName") or
                   round_data.get("activityName", "Unknown Course"))
    round_date = str(inner_sc.get("startTime") or round_data.get("startTimeLocal", ""))[:10]
    
    # Par per hole
    pars_str = snap.get("holePars", "")
    hole_pars = [int(c) for c in pars_str] if pars_str else []
    
    # Handicap per hole
    tee_name = inner_sc.get("teeBox", "")
    tees = snap.get("tees", [])
    tee = next((t for t in tees if t.get("name", "").lower() == tee_name.lower()), None)
    if not tee and tees:
        tee = tees[0]
    hcap_str = (tee or {}).get("holeHandicaps", "")
    hole_hcaps = [int(hcap_str[i:i + 2]) for i in range(0, len(hcap_str), 2)] if hcap_str else []
    
    hole_metas = {}
    for i, h in enumerate(inner_sc.get("holes", [])):
        n = h.get("number") or h.get("holeNumber") or (i + 1)
        hole_metas[n] = {
            "hole_number": n,
            "par": hole_pars[i] if i < len(hole_pars) else 4,
            "hole_handicap": hole_hcaps[i] if i < len(hole_hcaps) else 0,
            "hole_yards": 0,
            "strokes": h.get("strokes", 0),
            "penalties": h.get("penalties", 0),
            "putts": h.get("putts", 0),
            "fairway": h.get("fairwayShotOutcome", ""),
            "pin_lat": _ll(h["pinPositionLat"]) if h.get("pinPositionLat") else None,
            "pin_lon": _ll(h["pinPositionLon"]) if h.get("pinPositionLon") else None,
        }
    
    return course_name, round_date, hole_metas


def parse_shots_for_hole(hole_data: Dict, meta: Dict, club_map: Optional[Dict[int, str]] = None) -> List[Dict]:
    """
    Parse shot data for a single hole
    
    Args:
        hole_data: Hole shot data from Garmin API
        meta: Hole metadata
        club_map: Mapping of club IDs to names
        
    Returns:
        List of parsed shot dictionaries
    """
    shots_raw = sorted(hole_data.get("shots", []), key=lambda s: s.get("shotOrder", 0))
    pin_lat = meta.get("pin_lat")
    pin_lon = meta.get("pin_lon")
    n = len(shots_raw)
    rows = []
    
    for idx, s in enumerate(shots_raw):
        sl = s.get("startLoc", {})
        el = s.get("endLoc", {})
        
        start_lie = normalise_lie(sl.get("lie", ""))
        end_lie = normalise_lie(el.get("lie", ""))
        
        # Calculate distances to hole
        start_dist = None
        end_dist = None
        
        if pin_lat is not None and sl.get("lat") is not None:
            start_dist = haversine_yards(_ll(sl["lat"]), _ll(sl["lon"]), pin_lat, pin_lon)
        
        if pin_lat is not None and el.get("lat") is not None:
            end_dist = haversine_yards(_ll(el["lat"]), _ll(el["lon"]), pin_lat, pin_lon)
        
        # Last shot within threshold → treat as holed
        if idx == n - 1 and end_dist is not None and end_dist <= HOLE_THRESHOLD_YARDS:
            end_dist = 0.0
            end_lie = "hole"
        
        # Resolve club name
        club_id = s.get("clubId")
        club = ""
        if club_id and club_map:
            club = club_map.get(int(club_id), str(club_id))
        elif club_id:
            club = str(club_id)
        
        rows.append({
            "hole_number": meta["hole_number"],
            "par": meta["par"],
            "hole_yards": meta["hole_yards"],
            "hole_handicap": meta["hole_handicap"],
            "shot_number": s.get("shotOrder", idx + 1),
            "club": club,
            "shot_type": s.get("shotType", "UNKNOWN").upper(),
            "start_lie": start_lie,
            "start_dist_yards": start_dist if start_dist is not None else None,
            "end_lie": end_lie,
            "end_dist_yards": end_dist if end_dist is not None else None,
            "penalty": 0,
        })
    
    # Apportion hole-level penalties to last non-putt shot
    hp = meta.get("penalties", 0)
    if hp:
        non_putts = [r for r in rows if r["shot_type"] != "PUTT"]
        if non_putts:
            non_putts[-1]["penalty"] = hp
    
    return rows


def parse_garmin_round(round_data: Dict) -> List[Dict]:
    """
    Parse complete Garmin round data into shot list
    
    Args:
        round_data: Complete round data from Garmin API
        
    Returns:
        List of shot dictionaries ready for import
    """
    activity_id = round_data.get("activityId", "")
    course_name, round_date, hole_metas = extract_scorecard_meta(round_data)
    
    # Build club map
    clubs_raw = round_data.get("clubs") or {}
    club_map = {int(k): v for k, v in clubs_raw.items()} if isinstance(clubs_raw, dict) else {}
    
    all_shots = []
    for hole_data in (round_data.get("shots") or {}).get("holes", []):
        h_num = hole_data.get("holeNumber", 0)
        meta = hole_metas.get(h_num, {
            "hole_number": h_num,
            "par": 4,
            "hole_yards": 0,
            "hole_handicap": 0,
            "penalties": 0,
            "pin_lat": None,
            "pin_lon": None,
        })
        
        for shot in parse_shots_for_hole(hole_data, meta, club_map):
            # Add round-level metadata
            shot["round_id"] = activity_id
            shot["round_date"] = round_date
            shot["course_name"] = course_name
            
            # Convert to API format
            all_shots.append({
                "shot_date": round_date,
                "hole_number": shot["hole_number"],
                "shot_number": shot["shot_number"],
                "club": shot["club"],
                "distance": shot.get("start_dist_yards"),  # Shot distance (for display)
                "start_position": shot["start_lie"],
                "end_position": shot["end_lie"],
                "start_distance_to_hole": shot.get("start_dist_yards"),
                "end_distance_to_hole": shot.get("end_dist_yards"),
            })
    
    logger.info(f"Parsed {len(all_shots)} shots from round {activity_id}")
    return all_shots
