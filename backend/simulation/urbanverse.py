"""UrbanVerse -- the deterministic physics-based traffic simulator.

This is the single source of truth for every value rendered in the
METRO-FLOW dashboard. No agent, chart, prediction or alert produces data
that does not derive from a tick of this engine.

Coordinate system
-----------------
The road graph is a 3x3 grid of intersections 250m apart, with N/S/E/W
lanes connecting adjacent intersections. Each lane is 250m long with a
traffic signal 230m down the lane.

Vehicles travel in their lane, obey signal rules, queue when obstructed,
turn at intersections, accelerate/decelerate with realistic kinematics,
and emit CO2 + fuel consumption as they travel. Determinism is achieved
by seeding the spawn RNG with the engine's seed field.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .intersections import Intersection, SignalColor
from .vehicles import (
    Direction,
    Movement,
    QueueState,
    SignalState,
    Vehicle,
    VehicleType,
    _TYPE_PARAMS,
)


class Scenario(str, Enum):
    NORMAL = "normal"
    MORNING_RUSH = "morning_rush"
    EVENING_RUSH = "evening_rush"
    HEAVY_RAIN = "heavy_rain"
    ACCIDENT = "accident"
    ROAD_BLOCK = "road_block"
    FESTIVAL = "festival"
    SCHOOL_ZONE = "school_zone"
    VIP_MOVEMENT = "vip_movement"
    EMERGENCY_CORRIDOR = "emergency_corridor"
    CONSTRUCTION_ZONE = "construction_zone"


_OPPOSITE = {
    Direction.NORTH: Direction.SOUTH,
    Direction.SOUTH: Direction.NORTH,
    Direction.EAST: Direction.WEST,
    Direction.WEST: Direction.EAST,
}
Direction.opposite = lambda self: _OPPOSITE[self]  # type: ignore


# Scenario tuning: ramps up specific vehicle types and adds environmental
# modifiers (visibility, speed cap, accident probability).
_DEFAULT_WEIGHTS = {t.value: 1.0 for t in VehicleType}
SCENARIO_CONFIG: dict[Scenario, dict] = {
    Scenario.NORMAL: dict(spawn_per_tick=2, max_speed_scale=1.0, rain=False, fog=False, weight=dict(_DEFAULT_WEIGHTS)),
    Scenario.MORNING_RUSH: dict(spawn_per_tick=5, max_speed_scale=0.85, rain=False, fog=False, weight={"car": 0.55, "bus": 0.25, "bike": 0.20, "auto": 0.10}),
    Scenario.EVENING_RUSH: dict(spawn_per_tick=5, max_speed_scale=0.80, rain=False, fog=False, weight={"car": 0.6, "auto": 0.2, "pedestrian": 0.2}),
    Scenario.HEAVY_RAIN: dict(spawn_per_tick=2, max_speed_scale=0.6, rain=True, fog=False),
    Scenario.ACCIDENT: dict(spawn_per_tick=2, max_speed_scale=0.7, rain=False, fog=False, block_road=("east", "J-1-1")),
    Scenario.ROAD_BLOCK: dict(spawn_per_tick=2, max_speed_scale=0.8, rain=False, fog=False, block_road=("south", "J-2-1")),
    Scenario.FESTIVAL: dict(spawn_per_tick=6, max_speed_scale=0.7, rain=False, fog=False, weight={"pedestrian": 0.4, "car": 0.3, "auto": 0.3}),
    Scenario.SCHOOL_ZONE: dict(spawn_per_tick=3, max_speed_scale=0.55, rain=False, fog=False, weight={"bus": 0.4, "pedestrian": 0.3, "bike": 0.3}),
    Scenario.VIP_MOVEMENT: dict(spawn_per_tick=3, max_speed_scale=0.9, rain=False, fog=False, weight={"vip_convoy": 0.3, "police": 0.3, "car": 0.4}),
    Scenario.EMERGENCY_CORRIDOR: dict(spawn_per_tick=3, max_speed_scale=1.0, rain=False, fog=False, weight={"ambulance": 0.4, "fire_truck": 0.3, "car": 0.3}),
    Scenario.CONSTRUCTION_ZONE: dict(spawn_per_tick=2, max_speed_scale=0.65, rain=False, fog=True, weight={"truck": 0.4, "car": 0.6}),
}


@dataclass
class Lane:
    direction: Direction
    intersection_id: str          # intersection the lane leads INTO
    vehicles: list[Vehicle] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "direction": self.direction.value,
            "intersection_id": self.intersection_id,
            "vehicle_count": len(self.vehicles),
            "vehicles": [v.to_dict() for v in self.vehicles],
        }


class UrbanVerse:
    """Deterministic city-wide traffic simulator."""

    def __init__(self, seed: int = 42) -> None:
        self.seed = seed
        self.rng = random.Random(seed)
        self.scenario: Scenario = Scenario.NORMAL
        self._tick_index: int = 0
        self._sim_time: float = 0.0
        self._started_at: float = time.time()

        # 3x3 grid of intersections, 250m apart
        self.intersections: dict[str, Intersection] = {}
        for r in range(3):
            for c in range(3):
                iid = f"J-{r}-{c}"
                self.intersections[iid] = Intersection(
                    id=iid,
                    x=c * 250.0,
                    y=r * 250.0,
                    main_axis=("north", "south") if r % 2 == 0 else ("east", "west"),
                )

        # 4 inbound lanes per intersection
        self.lanes: dict[str, dict[Direction, Lane]] = {}
        for iid in self.intersections:
            self.lanes[iid] = {
                Direction.NORTH: Lane(Direction.NORTH, iid),
                Direction.SOUTH: Lane(Direction.SOUTH, iid),
                Direction.EAST: Lane(Direction.EAST, iid),
                Direction.WEST: Lane(Direction.WEST, iid),
            }

        # rolling event log surface for agents and alerts
        self.events: list[dict] = []

        # rolled-up metrics
        self.metrics: dict[str, float] = {
            "total_vehicles_spawned": 0,
            "total_vehicles_exited": 0,
            "total_fuel_liters": 0.0,
            "total_co2_kg": 0.0,
            "average_wait_seconds": 0.0,
            "average_travel_seconds": 0.0,
            "__total_wait": 0.0,
            "__total_travel": 0.0,
        }

    # ----------------------------------------------------------------
    # Settings
    # ----------------------------------------------------------------
    def set_scenario(self, scenario: Scenario) -> None:
        self.scenario = scenario
        self.events.append({"ts": self._sim_time, "type": "scenario_change", "value": scenario.value})

    # ----------------------------------------------------------------
    # Spawning
    # ----------------------------------------------------------------
    def _spawn_vehicle(self) -> Optional[Vehicle]:
        cfg = SCENARIO_CONFIG[self.scenario]
        weight = cfg.get("weight") or _DEFAULT_WEIGHTS
        types = list(weight.keys())
        ws = [weight[t] for t in types]
        vtype = VehicleType(self.rng.choices(types, weights=ws, k=1)[0])

        dirs = [Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST]
        src = self.rng.choice(dirs)
        dest = self.rng.choice([d for d in dirs if d != src])

        intersection_id = self.rng.choice(list(self.intersections.keys()))
        lane = self.lanes[intersection_id][src]

        # enforce a soft cap and avoid teleporting onto existing cars
        if len(lane.vehicles) > 18:
            return None
        if lane.vehicles:
            last = lane.vehicles[-1]
            start_pos = last.position + last.length + 1.0
            if start_pos > 220.0:
                return None
        else:
            start_pos = 0.0

        v = Vehicle(
            type=vtype,
            direction=src,
            destination=dest,
            position=start_pos,
            lane=len(lane.vehicles) % 3,
            priority=_TYPE_PARAMS[vtype]["priority"],
        )

        # simple straight/right/left choice
        roll = self.rng.random()
        v.turning = Movement.TURN_LEFT if roll < 0.2 else Movement.TURN_RIGHT if roll < 0.45 else Movement.GO_STRAIGHT

        lane.vehicles.append(v)
        self.metrics["total_vehicles_spawned"] += 1
        self.events.append({
            "ts": self._sim_time, "type": "spawn", "vehicle_id": v.id,
            "vtype": vtype.value, "dir": src.value, "dest": dest.value,
        })
        return v

    # ----------------------------------------------------------------
    # Tick -- the deterministic heartbeat
    # ----------------------------------------------------------------
    def tick(self, dt: float = 1.0) -> dict:
        """Advance simulation by dt seconds and return a snapshot."""
        self._tick_index += 1
        self._sim_time += dt
        cfg = SCENARIO_CONFIG[self.scenario]
        now = self._sim_time
        max_speed_scale = cfg["max_speed_scale"]

        # 1) advance signal phases
        for inter in self.intersections.values():
            inter.tick(dt, now)

        # 2) scenario special blocks
        accident_block = cfg.get("block_road") == ("east", "J-1-1")
        road_block = cfg.get("block_road") == ("south", "J-2-1")

        # 3) spawn new vehicles
        for _ in range(cfg["spawn_per_tick"]):
            self._spawn_vehicle()

        # 4) integrate each lane
        for iid, lanes in self.lanes.items():
            inter = self.intersections[iid]
            if not hasattr(inter, "_density") or inter._density is None:
                inter._density = {}
            for direction, lane in lanes.items():
                sig = inter.signals[direction.value]
                color = sig.color
                inter._density[direction.value] = len(lane.vehicles)

                i = len(lane.vehicles) - 1
                while i >= 0:
                    v = lane.vehicles[i]
                    self._step_vehicle(
                        v, lane, inter, color, dt, now, max_speed_scale,
                        accident_block=(accident_block and direction == Direction.EAST and iid == "J-1-1"),
                        road_block=(road_block and direction == Direction.SOUTH and iid == "J-2-1"),
                    )
                    # departed vehicles leave the network
                    if v.position > 245.0:
                        self.metrics["total_vehicles_exited"] += 1
                        self.metrics["total_fuel_liters"] += v.fuel_used
                        self.metrics["total_co2_kg"] += v.co2 / 1000.0
                        self.metrics["__total_wait"] += v.waiting_time
                        self.metrics["__total_travel"] += v.travel_time
                        n_exited = max(1, self.metrics["total_vehicles_exited"])
                        self.metrics["average_wait_seconds"] = self.metrics["__total_wait"] / n_exited
                        self.metrics["average_travel_seconds"] = self.metrics["__total_travel"] / n_exited
                        lane.vehicles.pop(i)
                    i -= 1

        # 5) emission & alert events
        self._synthesize_alerts()

        return self.snapshot()

    # ----------------------------------------------------------------
    # Vehicle physics
    # ----------------------------------------------------------------
    def _step_vehicle(
        self,
        v: Vehicle,
        lane: Lane,
        intersection: Intersection,
        signal_color: SignalColor,
        dt: float,
        now: float,
        speed_scale: float,
        accident_block: bool,
        road_block: bool,
    ) -> None:
        max_speed = v.max_speed * speed_scale
        params = v.params()

        # blocked special scenarios: just queue
        if accident_block and 200.0 <= v.position <= 245.0:
            v.queue_state = QueueState.QUEUED
            v.signal_state = SignalState.RED
            v.velocity = 0.0
            v.acceleration = -2.0
            v.waiting_time += dt
            v.priority_age += dt
            return
        if road_block and 200.0 <= v.position <= 245.0:
            v.queue_state = QueueState.QUEUED
            v.signal_state = SignalState.RED
            v.velocity = 0.0
            v.acceleration = -2.0
            v.waiting_time += dt
            v.priority_age += dt
            return

        # proximity to next car in front (car-following simplified)
        gap = 250.0
        idx_in_lane = lane.vehicles.index(v) if v in lane.vehicles else -1
        if idx_in_lane > 0:
            front = lane.vehicles[idx_in_lane - 1]
            gap = max(0.0, front.position - v.position - front.length)

        # signal logic: must stop if red/yellow and within 6m of stop line
        stop_line = 230.0
        distance_to_signal = stop_line - v.position
        must_stop_at_signal = (
            signal_color != SignalColor.GREEN and 0 < distance_to_signal < 6.0
        )

        if gap < 2.0 or must_stop_at_signal:
            v.velocity = max(0.0, v.velocity - 4.0 * dt)
            v.acceleration = -4.0
            v.queue_state = QueueState.QUEUED if v.velocity < 0.2 else QueueState.MOVING
            v.waiting_time += dt
            v.priority_age += dt
        elif v.velocity < max_speed:
            v.velocity = min(max_speed, v.velocity + 2.0 * dt)
            v.acceleration = 2.0
            v.queue_state = QueueState.MOVING
            v.waiting_time = max(0.0, v.waiting_time - 0.02 * dt)
        else:
            v.velocity = max_speed
            v.acceleration = 0.0
            v.queue_state = QueueState.MOVING

        v.signal_state = (
            SignalState.GREEN if signal_color == SignalColor.GREEN else
            SignalState.YELLOW if signal_color == SignalColor.YELLOW else
            SignalState.RED
        )

        # integrate position
        v.position += v.velocity * dt

        # bookkeeping
        v.travel_time += dt
        v.fuel_used += params["fuel_l_per_100km"] * (v.velocity * dt / 100000.0)
        v.co2 += params["co2_g_per_km"] * (v.velocity * dt / 1000.0)

    # ----------------------------------------------------------------
    # Alerts derived from state
    # ----------------------------------------------------------------
    def _synthesize_alerts(self) -> None:
        # queue spillover
        for iid, lanes in self.lanes.items():
            for d, lane in lanes.items():
                if len(lane.vehicles) > 14:
                    self.events.append({
                        "ts": self._sim_time, "type": "spillback_risk",
                        "intersection": iid, "direction": d.value,
                        "queue_length": len(lane.vehicles),
                        "severity": "medium",
                    })
        # overspeed (above 1.15 of base max)
        for iid, lanes in self.lanes.items():
            for lane in lanes.values():
                for v in lane.vehicles:
                    if v.velocity > v.max_speed * 1.15:
                        self.events.append({
                            "ts": self._sim_time, "type": "overspeed",
                            "vehicle_id": v.id, "velocity": round(v.velocity, 2),
                            "severity": "low",
                        })

        # bound event log
        if len(self.events) > 200:
            self.events = self.events[-200:]

    # ----------------------------------------------------------------
    # Snapshot
    # ----------------------------------------------------------------
    def snapshot(self) -> dict:
        """Build the full telemetry snapshot consumed by agents and UI."""
        vehicles: list[dict] = []
        per_type: dict[str, int] = {t.value: 0 for t in VehicleType}
        per_dir: dict[str, int] = {d.value: 0 for d in Direction}
        emergency: list[dict] = []
        total_speed = 0.0
        total_wait = 0.0
        total_fuel = 0.0
        total_co2 = 0.0
        active = 0

        for iid, lanes in self.lanes.items():
            for d, lane in lanes.items():
                per_dir[d.value] += len(lane.vehicles)
                for v in lane.vehicles:
                    if v.position < 245.0:
                        active += 1
                    per_type[v.type.value] += 1
                    total_speed += v.velocity
                    total_wait += v.waiting_time
                    total_fuel += v.fuel_used
                    total_co2 += v.co2
                    entry = {**v.to_dict(), "intersection_id": iid}
                    if v.is_emergency():
                        emergency.append(entry)
                    vehicles.append(entry)

        avg_speed = total_speed / max(1, active)
        avg_wait = total_wait / max(1, active)
        occupancy = min(1.0, active / 216.0)
        green_count = sum(
            1 for i in self.intersections.values()
            for s in i.signals.values() if s.color == SignalColor.GREEN
        )
        congestion_pct = max(0.0, min(1.0, active / 120.0 if green_count > 0 else 0.5))

        # city health score -- a composite metric used across dashboard tiles
        health = max(0.0, min(100.0,
            100.0
            - 40.0 * congestion_pct
            - 0.05 * avg_wait
            + 1.0 * (avg_speed / 22.0)
        ))

        return {
            "tick": self._tick_index,
            "sim_time": round(self._sim_time, 2),
            "scenario": self.scenario.value,
            "weather": {
                "rain": SCENARIO_CONFIG[self.scenario]["rain"],
                "fog": SCENARIO_CONFIG[self.scenario]["fog"],
            },
            "intersections": {iid: i.to_dict() for iid, i in self.intersections.items()},
            "lanes": {
                iid: {d.value: lane.to_dict() for d, lane in lanes.items()}
                for iid, lanes in self.lanes.items()
            },
            "vehicles": vehicles,
            "emergency_vehicles": emergency,
            "counts": {
                "active": active,
                "per_type": per_type,
                "per_direction": per_dir,
            },
            "metrics": {
                "average_speed_kmh": round(avg_speed * 3.6, 2),
                "average_wait_seconds": round(avg_wait, 2),
                "average_travel_seconds": round(self.metrics["average_travel_seconds"], 2),
                "occupancy_pct": round(occupancy * 100.0, 1),
                "congestion_pct": round(congestion_pct * 100.0, 1),
                "total_fuel_liters": round(total_fuel, 3),
                "total_co2_kg": round(total_co2 / 1000.0, 3),
                "city_health_score": round(health, 1),
            },
            "events": self.events[-25:],
            "weights": SCENARIO_CONFIG[self.scenario],
        }
