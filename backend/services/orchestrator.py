"""Orchestrator -- drives the simulation, runs the 20 agents, runs the UCP
pipeline in the right order, and broadcasts the resulting payload to any
subscribed WebSocket clients."""

from __future__ import annotations

import asyncio
import time
from typing import Callable, Optional

from ..agents import ALL_AGENTS
from ..agents.base_agent import MessageBus
from ..simulation.urbanverse import Scenario, UrbanVerse


class Orchestrator:
    """Coordinates one tick of the simulator + all 20 agents + UCP bus."""

    def __init__(self, seed: int = 42, tick_dt: float = 1.0) -> None:
        self.uv = UrbanVerse(seed=seed)
        self.bus = MessageBus()
        self.agents = [cls() for cls in ALL_AGENTS]
        self.tick_dt = tick_dt
        self.last_snapshot: dict = {}
        self.last_agent_results: list[dict] = []
        self._subscribers: list[Callable[[dict], None]] = []

    # ------------------------------------------------------------------
    # WebSocket subscription
    # ------------------------------------------------------------------
    def subscribe(self, cb: Callable[[dict], None]) -> None:
        self._subscribers.append(cb)

    async def broadcast(self, payload: dict) -> None:
        for cb in list(self._subscribers):
            try:
                cb(payload)
            except Exception:
                pass

    # ------------------------------------------------------------------
    # Tick pipeline
    # ------------------------------------------------------------------
    def tick_once(self) -> dict:
        snap = self.uv.tick(dt=self.tick_dt)

        # Run agents in dependency order so the bus topics surface naturally.
        order = [
            # --- perception ---
            "VisionAgent", "SensorTrustAgent", "WeatherAgent", "TrafficStateAgent",
            # --- events & emergencies ---
            "EventManagementAgent", "EmergencyResponseAgent", "PublicTransportAgent",
            # --- coordination ---
            "NeighborCoordinationAgent", "RouteOptimizationAgent", "SafetyGuardAgent",
            # --- consensus + shadow ---
            "UrbanConsensusAgent", "ShadowCityAgent",
            # --- controller executes ---
            "IntersectionControllerAgent",
            # --- analytics + prediction ---
            "PredictionAgent", "SustainabilityAgent", "AnalyticsAgent",
            # --- explain + alerts ---
            "ExplainableAIAgent", "AlertAgent",
            # --- dash + persona ---
            "DashboardAgent", "UrbanVerseAI",
        ]
        by_name = {a.__class__.__name__: a for a in self.agents}
        results = []
        for name in order:
            a = by_name.get(name)
            if not a:
                continue
            r = a.run(snap, self.bus)
            results.append(r.to_dict())

        payload = {
            "ts": time.time(),
            "tick": snap["tick"],
            "sim_time": snap["sim_time"],
            "scenario": snap.get("scenario"),
            "snapshot": snap,
            "agents": results,
            "bus_topics": list(self.bus.topics.keys()),
        }
        self.last_snapshot = snap
        self.last_agent_results = results
        return payload

    async def run_forever(self) -> None:
        """Async loop -- designed to be run inside FastAPI startup."""
        while True:
            payload = self.tick_once()
            await self.broadcast(payload)
            await asyncio.sleep(self.tick_dt)

    # ------------------------------------------------------------------
    # Settings endpoints
    # ------------------------------------------------------------------
    def set_scenario(self, scenario: str) -> None:
        try:
            self.uv.set_scenario(Scenario(scenario))
        except ValueError:
            pass

    def get_history(self, limit: int = 200) -> list[dict]:
        snap = self.uv.snapshot()
        return [{
            "ts": snap["sim_time"],
            "metrics": snap["metrics"],
            "active": snap["counts"]["active"],
        }]
