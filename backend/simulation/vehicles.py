"""Vehicle primitives for the UrbanVerse simulator.

Each vehicle is a self-contained agent with physics state, signal awareness,
priority, fuel & emissions tracking, and predictive metadata that downstream
AI agents consume.
"""

from __future__ import annotations

import math
import time
import uuid
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional


class VehicleType(str, Enum):
    CAR = "car"
    BIKE = "bike"
    BUS = "bus"
    TRUCK = "truck"
    AUTO = "auto"
    AMBULANCE = "ambulance"
    FIRE_TRUCK = "fire_truck"
    POLICE = "police"
    VIP_CONVOY = "vip_convoy"
    PEDESTRIAN = "pedestrian"
    CYCLIST = "cyclist"


class Direction(str, Enum):
    NORTH = "north"
    SOUTH = "south"
    EAST = "east"
    WEST = "west"


class Movement(str, Enum):
    GO_STRAIGHT = "go_straight"
    TURN_LEFT = "turn_left"
    TURN_RIGHT = "turn_right"
    ACCELERATE = "accelerate"
    BRAKE = "brake"
    QUEUE = "queue"
    SIGNAL_CROSSING = "signal_crossing"
    EXIT_NETWORK = "exit_network"


class SignalState(str, Enum):
    RED = "red"
    YELLOW = "yellow"
    GREEN = "green"


class QueueState(str, Enum):
    MOVING = "moving"
    QUEUED = "queued"
    CROSSING = "crossing"
    EXITED = "exited"


# Per-type kinematic + environmental parameters (m, m/s, m/s^2)
_TYPE_PARAMS = {
    VehicleType.CAR: dict(length=4.5, max_speed=22.0, accel=2.5, fuel_l_per_100km=7.5, co2_g_per_km=170, priority=1),
    VehicleType.BIKE: dict(length=1.8, max_speed=12.0, accel=2.0, fuel_l_per_100km=0.0, co2_g_per_km=0, priority=2),
    VehicleType.BUS: dict(length=12.0, max_speed=18.0, accel=1.6, fuel_l_per_100km=30.0, co2_g_per_km=820, priority=3),
    VehicleType.TRUCK: dict(length=14.0, max_speed=16.0, accel=1.2, fuel_l_per_100km=28.0, co2_g_per_km=750, priority=1),
    VehicleType.AUTO: dict(length=3.2, max_speed=16.0, accel=2.2, fuel_l_per_100km=5.0, co2_g_per_km=110, priority=2),
    VehicleType.AMBULANCE: dict(length=5.5, max_speed=28.0, accel=4.0, fuel_l_per_100km=12.0, co2_g_per_km=270, priority=10),
    VehicleType.FIRE_TRUCK: dict(length=9.0, max_speed=25.0, accel=3.5, fuel_l_per_100km=35.0, co2_g_per_km=950, priority=10),
    VehicleType.POLICE: dict(length=5.0, max_speed=26.0, accel=3.8, fuel_l_per_100km=11.0, co2_g_per_km=250, priority=9),
    VehicleType.VIP_CONVOY: dict(length=5.5, max_speed=24.0, accel=3.0, fuel_l_per_100km=10.0, co2_g_per_km=230, priority=9),
    VehicleType.PEDESTRIAN: dict(length=0.6, max_speed=2.0, accel=1.5, fuel_l_per_100km=0.0, co2_g_per_km=0, priority=4),
    VehicleType.CYCLIST: dict(length=1.7, max_speed=10.0, accel=1.8, fuel_l_per_100km=0.0, co2_g_per_km=0, priority=2),
}


@dataclass
class Vehicle:
    """A single self-driven entity in the UrbanVerse graph.

    Position is tracked in meters from a per-road origin. Lane index is the
    lateral offset multiplier (0..3). Velocity is m/s, acceleration is m/s^2.
    """

    type: VehicleType
    direction: Direction
    destination: Direction
    spawn_ts: float = field(default_factory=time.time)
    id: str = field(default_factory=lambda: f"V-{uuid.uuid4().hex[:8].upper()}")
    position: float = 0.0           # meters from road entrance
    velocity: float = 0.0            # m/s
    acceleration: float = 0.0        # m/s^2
    lane: int = 0
    signal_state: SignalState = SignalState.RED
    queue_state: QueueState = QueueState.MOVING
    priority: int = 1
    turning: Movement = Movement.GO_STRAIGHT
    waiting_time: float = 0.0
    travel_time: float = 0.0
    fuel_used: float = 0.0
    co2: float = 0.0
    priority_age: float = 0.0       # seconds since waiting

    # ---- convenience helpers ----
    def params(self) -> dict:
        return _TYPE_PARAMS[self.type]

    @property
    def length(self) -> float:
        return self.params()["length"]

    @property
    def max_speed(self) -> float:
        return self.params()["max_speed"]

    @property
    def base_priority(self) -> int:
        return self.params()["priority"]

    def is_emergency(self) -> bool:
        return self.type in {
            VehicleType.AMBULANCE,
            VehicleType.FIRE_TRUCK,
            VehicleType.POLICE,
            VehicleType.VIP_CONVOY,
        }

    def is_vulnerable(self) -> bool:
        return self.type in {VehicleType.PEDESTRIAN, VehicleType.CYCLIST, VehicleType.BIKE}

    def distance_to_signal(self, signal_position: float) -> float:
        return max(0.0, signal_position - self.position)

    def effective_priority(self) -> float:
        """Dynamic Priority Aging (DPA): priority grows while waiting so a
        starved low-priority vehicle eventually overtakes a stalled queue."""
        return float(self.base_priority) + (self.priority_age * 0.05)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["type"] = self.type.value
        d["direction"] = self.direction.value
        d["destination"] = self.destination.value
        d["signal_state"] = self.signal_state.value
        d["queue_state"] = self.queue_state.value
        d["turning"] = self.turning.value
        d["is_emergency"] = self.is_emergency()
        d["is_vulnerable"] = self.is_vulnerable()
        d["effective_priority"] = round(self.effective_priority(), 3)
        return d
