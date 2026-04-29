"""
Sample Data Generator for Strokes Gained Application

This script generates realistic golf shot data for testing and demonstration purposes.
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict

# Club configurations
CLUBS = {
    "Driver": {"avg_distance": 260, "variance": 30},
    "3 Wood": {"avg_distance": 230, "variance": 25},
    "5 Wood": {"avg_distance": 210, "variance": 20},
    "3 Hybrid": {"avg_distance": 195, "variance": 20},
    "4 Iron": {"avg_distance": 185, "variance": 18},
    "5 Iron": {"avg_distance": 175, "variance": 16},
    "6 Iron": {"avg_distance": 165, "variance": 15},
    "7 Iron": {"avg_distance": 155, "variance": 14},
    "8 Iron": {"avg_distance": 145, "variance": 13},
    "9 Iron": {"avg_distance": 135, "variance": 12},
    "PW": {"avg_distance": 120, "variance": 10},
    "SW": {"avg_distance": 80, "variance": 15},
    "LW": {"avg_distance": 60, "variance": 12},
    "Putter": {"avg_distance": 20, "variance": 10},
}

POSITIONS = ["tee_box", "fairway", "rough", "sand", "green"]


def generate_shot(
    hole_number: int,
    shot_number: int,
    remaining_distance: int,
    current_position: str,
    shot_date: str
) -> Dict:
    """Generate a single realistic golf shot"""
    
    # Select appropriate club based on distance
    club = select_club(remaining_distance, current_position)
    club_data = CLUBS[club]
    
    # Calculate shot distance with some variance
    distance = max(5, min(
        remaining_distance,
        int(random.gauss(club_data["avg_distance"], club_data["variance"]))
    ))
    
    # Determine ending position
    new_distance = remaining_distance - distance
    
    if current_position == "green" or new_distance <= 0:
        end_position = "green"
        new_distance = 0
    elif club == "Driver" or current_position == "tee_box":
        # Tee shots might miss fairway
        end_position = random.choices(
            ["fairway", "rough", "sand"],
            weights=[0.6, 0.3, 0.1]
        )[0]
    elif new_distance < 30:
        end_position = "green"
    else:
        # Approach shots
        end_position = random.choices(
            ["green", "fairway", "rough", "sand"],
            weights=[0.4, 0.3, 0.2, 0.1]
        )[0]
    
    return {
        "shot_date": shot_date,
        "hole_number": hole_number,
        "shot_number": shot_number,
        "club": club,
        "distance": distance,
        "start_position": current_position,
        "end_position": end_position,
        "start_distance_to_hole": remaining_distance,
        "end_distance_to_hole": new_distance,
    }


def select_club(distance: int, position: str) -> str:
    """Select appropriate club for the situation"""
    
    if position == "green":
        return "Putter"
    elif position == "tee_box":
        if distance > 400:
            return "Driver"
        elif distance > 350:
            return random.choice(["Driver", "3 Wood"])
        else:
            return "3 Wood"
    elif position == "sand":
        if distance < 40:
            return "LW"
        else:
            return "SW"
    else:
        # Select based on distance
        if distance > 250:
            return random.choice(["3 Wood", "5 Wood"])
        elif distance > 200:
            return random.choice(["3 Hybrid", "4 Iron"])
        elif distance > 180:
            return "5 Iron"
        elif distance > 160:
            return "6 Iron"
        elif distance > 150:
            return "7 Iron"
        elif distance > 140:
            return "8 Iron"
        elif distance > 125:
            return "9 Iron"
        elif distance > 100:
            return "PW"
        elif distance > 70:
            return "SW"
        else:
            return "LW"


def generate_hole(hole_number: int, shot_date: str, par: int = 4) -> List[Dict]:
    """Generate all shots for a single hole"""
    
    # Determine hole distance based on par
    if par == 3:
        hole_distance = random.randint(150, 210)
    elif par == 4:
        hole_distance = random.randint(350, 430)
    else:  # par 5
        hole_distance = random.randint(500, 580)
    
    shots = []
    shot_number = 1
    remaining_distance = hole_distance
    current_position = "tee_box"
    
    # Generate shots until we reach the green
    max_shots = 8  # Prevent infinite loops
    while remaining_distance > 0 and shot_number <= max_shots:
        shot = generate_shot(
            hole_number,
            shot_number,
            remaining_distance,
            current_position,
            shot_date
        )
        shots.append(shot)
        
        remaining_distance = shot["end_distance_to_hole"]
        current_position = shot["end_position"]
        shot_number += 1
    
    return shots


def generate_round(round_date: str, num_holes: int = 18) -> List[Dict]:
    """Generate a complete round of golf"""
    
    # Typical course layout
    pars = [4, 4, 3, 5, 4, 4, 3, 5, 4] * 2  # Standard par 72
    pars = pars[:num_holes]
    
    all_shots = []
    for hole_num in range(1, num_holes + 1):
        hole_shots = generate_hole(hole_num, round_date, pars[hole_num - 1])
        all_shots.extend(hole_shots)
    
    return all_shots


def generate_multiple_rounds(num_rounds: int = 5, start_date: str = None) -> List[Dict]:
    """Generate multiple rounds over different dates"""
    
    if start_date is None:
        # Start from 30 days ago
        start = datetime.now() - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    
    all_shots = []
    for i in range(num_rounds):
        # Space rounds a few days apart
        round_date = (start + timedelta(days=i * random.randint(3, 7))).strftime("%Y-%m-%d")
        round_shots = generate_round(round_date)
        all_shots.extend(round_shots)
    
    return all_shots


def main():
    """Generate sample data and save to JSON file"""
    
    print("Generating sample golf shot data...")
    
    # Generate 3 rounds of golf
    shots = generate_multiple_rounds(num_rounds=3)
    
    print(f"Generated {len(shots)} shots across 3 rounds")
    
    # Save to file
    output_file = "sample_golf_data.json"
    with open(output_file, "w") as f:
        json.dump(shots, f, indent=2)
    
    print(f"Data saved to {output_file}")
    
    # Print summary
    rounds = {}
    for shot in shots:
        date = shot["shot_date"]
        if date not in rounds:
            rounds[date] = 0
        rounds[date] += 1
    
    print("\nSummary:")
    for date, count in sorted(rounds.items()):
        print(f"  {date}: {count} shots")


if __name__ == "__main__":
    main()
