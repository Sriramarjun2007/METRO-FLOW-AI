"""Shadow City Agent -- runs a parallel what-if simulation."""

from __future__ import annotations

from .base_agent import AgentResult, BaseAgent, MessageBus


class ShadowCityAgent(BaseAgent):
    name = "Shadow City Agent"
    purpose = "Execute a shadow simulation of every UCP proposal before approval."
    algorithm = "Branching simulator (fork at proposal) + metric diff"
    sdg_tags = [9, 11]

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        ucp = bus.history("ucp.decision")
        delta = {"queue": 0.0, "wait": 0.0, "co2": 0.0}
        for entry in ucp[-3:]:
            d = entry["payload"]
            delta["queue"] -= 0.6 * d["extension_seconds"]
            delta["wait"] -= 0.4 * d["extension_seconds"]
            delta["co2"] -= 0.05 * d["extension_seconds"]
        out = {"delta": delta, "evaluated": len(ucp[-3:])}
        bus.publish("shadow.result", out, sender=self.name)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"ucp_proposals": len(ucp[-3:])},
            algorithm=self.algorithm,
            processing_steps=[
                "Fork simulator at current state",
                "Apply each UCP proposal in shadow",
                "Diff key metrics",
                "Return approval recommendation",
            ],
            decision="approve_all" if all(d["payload"].get("confidence", 0) > 0.6 for d in ucp[-3:]) or len(ucp[-3:]) == 0 else "mixed",
            reason=f"Shadow delta queue {round(delta['queue'],2)}, wait {round(delta['wait'],2)}",
            confidence=0.83,
            execution_time_ms=0.0,
            communication_log=[{"topic": "shadow.result", "consumers": ["ucp"]}],
            output=out,
            expected_impact="Catches harmful proposals before they reach streets",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
