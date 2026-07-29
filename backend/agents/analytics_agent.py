"""Analytics Agent -- builds the chart datasets for the Analytics page."""

from __future__ import annotations

from collections import defaultdict
from .base_agent import AgentResult, BaseAgent, MessageBus


class AnalyticsAgent(BaseAgent):
    name = "Analytics Agent"
    purpose = "Build longitudinal analytics for the Analytics page."
    algorithm = "Sliding window aggregations + per-intersection performance"
    sdg_tags = [9, 11]

    def __init__(self) -> None:
        super().__init__()
        self.history: list[dict] = []

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        self.history.append(snapshot["metrics"])
        self.history = self.history[-300:]
        per_intersection = {}
        for iid, lanes in snapshot["lanes"].items():
            per_intersection[iid] = {
                "density": sum(l["vehicle_count"] for l in lanes.values()),
                "queue": sum(1 for l in lanes.values() for v in l["vehicles"] if v["velocity"] < 0.5),
                "speed_kmh": round(
                    sum(v["velocity"] for l in lanes.values() for v in l["vehicles"]) * 3.6 / max(1, sum(l["vehicle_count"] for l in lanes.values())),
                    2,
                ),
                "throughput": sum(l["vehicle_count"] for l in lanes.values()),
            }
        counts = snapshot["counts"]
        vehicle_type_mix = counts["per_type"]
        direction_mix = counts["per_direction"]
        bus.publish("analytics.snapshot", {"metrics_window": self.history[-30:], "per_intersection": per_intersection}, sender=self.name)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"history_window": len(self.history)},
            algorithm=self.algorithm,
            processing_steps=[
                "Maintain rolling 300-tick metrics ring",
                "Aggregate per-intersection performance",
                "Total vehicle type and direction mix",
                "Publish for charts",
            ],
            decision="publish_analytics",
            reason=f"Analytics window {len(self.history)} ticks",
            confidence=0.92,
            execution_time_ms=0.0,
            communication_log=[{"topic": "analytics.snapshot", "consumers": ["dashboard", "reports"]}],
            output={"per_intersection": per_intersection, "vehicle_type_mix": vehicle_type_mix, "direction_mix": direction_mix},
            expected_impact="Historical context for operator decisions",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
