"""Event Management Agent -- surfaces and triages scenario events."""

from __future__ import annotations

from .base_agent import AgentResult, BaseAgent, MessageBus


class EventManagementAgent(BaseAgent):
    name = "Event Management Agent"
    purpose = "Triage scenario events (accidents, festivals, VIP, road blocks) and seed upstream agents."
    algorithm = "Event classifier + impact diffusion"
    sdg_tags = [11, 17]

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        scenario = snapshot.get("scenario", "normal")
        catalog = {
            "morning_rush": ("event", "high", "Pre-allocate green-wave on commuter corridors"),
            "evening_rush": ("event", "high", "Pre-allocate green-wave on return corridors"),
            "heavy_rain": ("weather", "medium", "Drop speed caps and increase pedestrian priority"),
            "accident": ("incident", "critical", "Open detour, clear emergency corridor"),
            "road_block": ("incident", "high", "Open detour routes"),
            "festival": ("event", "medium", "Boost pedestrian + public transport priority"),
            "school_zone": ("safety", "high", "Restrict top speed near schools"),
            "vip_movement": ("vip", "high", "Coordinate police escort routing"),
            "emergency_corridor": ("incident", "critical", "Open green corridor network-wide"),
            "construction_zone": ("workzone", "medium", "Reduce lane capacities, restrict trucks"),
        }
        entry = catalog.get(scenario, ("routine", "low", "No special action"))
        event_type, severity, action = entry
        out = {"scenario": scenario, "type": event_type, "severity": severity, "action": action}
        bus.publish("event.management", out, sender=self.name)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"scenario": scenario},
            algorithm=self.algorithm,
            processing_steps=[
                "Read current scenario",
                "Match event catalogue",
                "Generate recommended action set",
                "Broadcast to coordinator agents",
            ],
            decision=action,
            reason=f"Scenario {scenario} -> {event_type}/{severity}",
            confidence=0.9,
            execution_time_ms=0.0,
            communication_log=[{"topic": "event.management", "consumers": ["ucp", "neighbor", "emergency"]}],
            output=out,
            expected_impact="Faster response to disruptive events",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
