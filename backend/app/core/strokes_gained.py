"""
Strokes Gained Calculation Engine
This module contains the core logic for calculating strokes gained metrics
"""
from typing import Dict, Optional
import pandas as pd
import numpy as np

# Benchmark data - Expected strokes to hole out from various distances and lies
# These are simplified values - replace with actual PGA Tour/Scratch/Bogey data
BENCHMARKS = {
    "pga_tour": {
        "tee_box": {
            100: 2.8, 150: 2.9, 200: 3.0, 250: 3.2, 300: 3.4, 350: 3.6, 400: 3.8
        },
        "fairway": {
            50: 2.5, 75: 2.6, 100: 2.7, 125: 2.8, 150: 2.9, 175: 3.0, 200: 3.1, 225: 3.2
        },
        "rough": {
            50: 2.7, 75: 2.8, 100: 2.9, 125: 3.0, 150: 3.1, 175: 3.2, 200: 3.4
        },
        "sand": {
            10: 2.8, 20: 2.9, 30: 3.0, 40: 3.1, 50: 3.2
        },
        "green": {
            3: 1.5, 5: 1.6, 10: 1.7, 15: 1.8, 20: 1.9, 25: 2.0, 30: 2.1
        }
    },
    "scratch": {
        "tee_box": {
            100: 3.0, 150: 3.1, 200: 3.3, 250: 3.5, 300: 3.7, 350: 3.9, 400: 4.1
        },
        "fairway": {
            50: 2.7, 75: 2.8, 100: 2.9, 125: 3.0, 150: 3.1, 175: 3.2, 200: 3.4, 225: 3.5
        },
        "rough": {
            50: 2.9, 75: 3.0, 100: 3.2, 125: 3.3, 150: 3.4, 175: 3.5, 200: 3.7
        },
        "sand": {
            10: 3.0, 20: 3.1, 30: 3.2, 40: 3.3, 50: 3.5
        },
        "green": {
            3: 1.6, 5: 1.7, 10: 1.8, 15: 1.9, 20: 2.0, 25: 2.1, 30: 2.2
        }
    },
    "bogey": {
        "tee_box": {
            100: 3.5, 150: 3.7, 200: 3.9, 250: 4.2, 300: 4.5, 350: 4.8, 400: 5.1
        },
        "fairway": {
            50: 3.2, 75: 3.3, 100: 3.5, 125: 3.7, 150: 3.9, 175: 4.1, 200: 4.3, 225: 4.5
        },
        "rough": {
            50: 3.4, 75: 3.6, 100: 3.8, 125: 4.0, 150: 4.2, 175: 4.4, 200: 4.6
        },
        "sand": {
            10: 3.5, 20: 3.6, 30: 3.7, 40: 3.9, 50: 4.1
        },
        "green": {
            3: 1.8, 5: 1.9, 10: 2.0, 15: 2.1, 20: 2.2, 25: 2.3, 30: 2.4
        }
    }
}


class StrokesGainedCalculator:
    """Calculate strokes gained for individual shots"""
    
    def __init__(self, benchmark: str = "pga_tour"):
        """
        Initialize calculator with a specific benchmark
        
        Args:
            benchmark: One of 'pga_tour', 'scratch', 'bogey'
        """
        if benchmark not in BENCHMARKS:
            raise ValueError(f"Invalid benchmark: {benchmark}")
        self.benchmark = BENCHMARKS[benchmark]
        self.benchmark_name = benchmark
    
    def get_expected_strokes(self, distance_yards: float, lie: str) -> float:
        """
        Get expected strokes to hole out from a given position
        
        Args:
            distance_yards: Distance to hole in yards
            lie: Type of lie (tee_box, fairway, rough, sand, green)
        
        Returns:
            Expected strokes to hole out
        """
        lie = lie.lower().replace(" ", "_")
        
        if lie not in self.benchmark:
            # Default to fairway if lie type unknown
            lie = "fairway"
        
        lie_data = self.benchmark[lie]
        
        # Get the two nearest distances
        distances = sorted(lie_data.keys())
        
        # Handle edge cases
        if distance_yards <= distances[0]:
            return lie_data[distances[0]]
        if distance_yards >= distances[-1]:
            return lie_data[distances[-1]]
        
        # Linear interpolation between nearest points
        for i in range(len(distances) - 1):
            if distances[i] <= distance_yards <= distances[i + 1]:
                d1, d2 = distances[i], distances[i + 1]
                s1, s2 = lie_data[d1], lie_data[d2]
                
                # Linear interpolation
                ratio = (distance_yards - d1) / (d2 - d1)
                return s1 + ratio * (s2 - s1)
        
        return lie_data[distances[-1]]
    
    def calculate_strokes_gained(
        self,
        start_distance: float,
        start_lie: str,
        end_distance: float,
        end_lie: str,
        strokes_taken: int = 1
    ) -> float:
        """
        Calculate strokes gained for a single shot
        
        Args:
            start_distance: Starting distance to hole (yards)
            start_lie: Starting lie type
            end_distance: Ending distance to hole (yards)
            end_lie: Ending lie type
            strokes_taken: Number of strokes taken (usually 1, could be penalty)
        
        Returns:
            Strokes gained value (positive is good)
        """
        expected_start = self.get_expected_strokes(start_distance, start_lie)
        expected_end = self.get_expected_strokes(end_distance, end_lie)
        
        # Strokes Gained = Expected strokes before - (strokes taken + expected strokes after)
        sg = expected_start - (strokes_taken + expected_end)
        
        return round(sg, 4)


def parse_garmin_shot(shot_data: Dict) -> Dict:
    """
    Parse Garmin shot data into standardized format
    
    Args:
        shot_data: Raw Garmin shot data dictionary
    
    Returns:
        Standardized shot dictionary
    """
    return {
        "club": shot_data.get("club", "Unknown"),
        "distance_yards": shot_data.get("distance", 0),
        "start_lie": shot_data.get("start_position", "fairway"),
        "end_lie": shot_data.get("end_position", "green"),
        "start_distance": shot_data.get("start_distance_to_hole", 0),
        "end_distance": shot_data.get("end_distance_to_hole", 0),
    }


def calculate_summary_metrics(shots_df: pd.DataFrame) -> Dict:
    """
    Calculate summary metrics from shots DataFrame
    
    Args:
        shots_df: DataFrame containing shot data with strokes_gained column
    
    Returns:
        Dictionary of summary metrics
    """
    if shots_df.empty:
        return {
            "total_shots": 0,
            "total_strokes_gained": 0.0,
            "avg_strokes_gained": 0.0,
            "best_shot": 0.0,
            "worst_shot": 0.0,
            "positive_shots": 0,
            "negative_shots": 0
        }
    
    sg_values = shots_df["strokes_gained"].dropna()
    
    return {
        "total_shots": len(shots_df),
        "total_strokes_gained": round(sg_values.sum(), 2),
        "avg_strokes_gained": round(sg_values.mean(), 4),
        "best_shot": round(sg_values.max(), 4) if len(sg_values) > 0 else 0.0,
        "worst_shot": round(sg_values.min(), 4) if len(sg_values) > 0 else 0.0,
        "positive_shots": int((sg_values > 0).sum()),
        "negative_shots": int((sg_values < 0).sum())
    }
