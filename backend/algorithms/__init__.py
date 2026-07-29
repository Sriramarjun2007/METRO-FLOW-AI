"""METRO-FLOW AI Algorithms Engine.

All whitelisted algorithms for the Algorithms documentation page live here:

    YOLOv8 simulation, OpenCV pre-processing proxies, Urban Consensus
    Protocol, Dynamic Priority Aging, Deadlock / Gridlock / Spillback
    detection, Neighbor Coordination, Traffic Density estimation,
    Sensor Trust Score, Queue Optimization, Digital Twin diffing,
    Dijkstra, A*, Time-Series Prediction, Collision detection.
"""

from .ucp import UCPRound, UCPDecision, UCPStage, reach_consensus, starvation_check
from .pathfinding import dijkstra, astar
from .prediction import (
    Forecast,
    linear_forecast,
    traffic_density,
    sensor_trust,
    hit_collision,
    green_wave_propagation,
)
from .traffic import (
    dynamic_priority_aging,
    detect_gridlock,
    detect_spillback,
    detect_starvation,
    deadlock_check,
    queue_optimization,
    digital_twin_diff,
    queue_length_estimate,
)

__all__ = [
    "UCPRound", "UCPDecision", "UCPStage", "reach_consensus", "starvation_check",
    "dijkstra", "astar",
    "Forecast", "linear_forecast", "traffic_density", "sensor_trust",
    "hit_collision", "green_wave_propagation",
    "dynamic_priority_aging", "detect_gridlock", "detect_spillback",
    "detect_starvation", "deadlock_check", "queue_optimization",
    "digital_twin_diff", "queue_length_estimate",
]
