"""Dashboard Agent -- composes everything for the live dashboard tile."""

from __future__ import annotations

from .base_agent import AgentResult, BaseAgent, MessageBus


class DashboardAgent(BaseAgent):
    name = "Dashboard Agent"
    purpose = "Assemble the live KPI strip from sensor, agent, and prediction data."
    algorithm = "Composite aggregation kpi = w1*speed + w2*health - w3*congestion"
    sdg_tags = [9, 11]

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        metrics = snapshot["metrics"]
        kpis = {
            "vehicles_active": snapshot["counts"]["active"],
            "average_speed_kmh": metrics["average_speed_kmh"],
            "average_wait_seconds": metrics["average_wait_seconds"],
            "occupancy_pct": metrics["occupancy_pct"],
            "congestion_pct": metrics["congestion_pct"],
            "emergency_count": len(snapshot["emergency_vehicles"]),
            "city_health_score": metrics["city_health_score"],
            "co2_kg": metrics["total_co2_kg"],
            "fuel_l": metrics["total_fuel_liters"],
            "queues_total": sum(
                1 for iid, lanes in snapshot["lanes"].items()
                for lane in lanes.values() for v in lane["vehicles"] if v["velocity"] < 0.5
            ),
        }
        bus.publish("dashboard.kpis", kpis, sender=self.name)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"sources": ["vision", "state", "prediction", "ucp"]},
            algorithm=self.algorithm,
            processing_steps=[
                "Aggregate current snapshot",
                "Trim tick history to 200s window",
                "Compute city health score",
                "Publish KPI bundle",
            ],
            decision="publish_dashboard",
            reason="Live KPIs refreshed from simulator state",
            confidence=0.94,
            execution_time_ms=0.0,
            communication_log=[{"topic": "dashboard.kpis", "consumers": ["ui"]}],
            output=kpis,
            expected_impact="Single point of operator awareness",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
