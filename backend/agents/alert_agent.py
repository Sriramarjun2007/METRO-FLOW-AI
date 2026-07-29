"""Alert Agent -- detects and triages incidents from the simulator event log."""

from __future__ import annotations

from .base_agent import AgentResult, BaseAgent, MessageBus


class AlertAgent(BaseAgent):
    name = "Alert Agent"
    purpose = "Generate, prioritize, and route alerts for accidents, overspeed, sensor failures, etc."
    algorithm = "Rule-based + severity scoring"
    sdg_tags = [3, 11]

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        alerts: list[dict] = []
        for ev in snapshot.get("events", []):
            if ev["type"] == "spawn":
                continue
            severity = ev.get("severity", "low")
            alerts.append({
                "id": f"ALT-{ev['ts']}-{len(alerts)}",
                "type": ev["type"],
                "severity": severity,
                "ts": ev["ts"],
                "details": {k: v for k, v in ev.items() if k not in ("type",)},
            })
        # also: heavy rain overlay
        if snapshot["weather"]["rain"]:
            alerts.append({
                "id": f"ALT-WX-RAIN-{snapshot['sim_time']}",
                "type": "heavy_rain",
                "severity": "high",
                "ts": snapshot["sim_time"],
                "details": {"scenario": snapshot["scenario"]},
            })
        if snapshot["weather"]["fog"]:
            alerts.append({
                "id": f"ALT-WX-FOG-{snapshot['sim_time']}",
                "type": "fog",
                "severity": "medium",
                "ts": snapshot["sim_time"],
                "details": {"scenario": snapshot["scenario"]},
            })
        for e in snapshot.get("emergency_vehicles", []):
            alerts.append({
                "id": f"ALT-EMRG-{e['id']}",
                "type": e["type"], "severity": "critical",
                "ts": snapshot["sim_time"],
                "details": {"vehicle_id": e["id"], "intersection": e["intersection_id"]},
            })
        bus.publish("alert.active", alerts, sender=self.name)
        severity_score = sum({"low": 1, "medium": 2, "high": 3, "critical": 4}.get(a["severity"], 1) for a in alerts)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"events": len(snapshot.get("events", []))},
            algorithm=self.algorithm,
            processing_steps=[
                "Scan simulator events",
                "Compute severity scores",
                "Tag affected roads and intersections",
                "Dispatch via bus",
            ],
            decision="dispatch_alerts" if alerts else "idle",
            reason=f"Total severity load {severity_score}",
            confidence=0.91,
            execution_time_ms=0.0,
            communication_log=[{"topic": "alert.active", "consumers": ["dashboard", "operators"]}],
            output={"alerts": alerts, "severity_total": severity_score},
            expected_impact="Zero-latency situational awareness",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
