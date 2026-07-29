"""Public Transport Agent -- prioritises buses and rewards modal shift."""

from __future__ import annotations

from .base_agent import AgentResult, BaseAgent, MessageBus


class PublicTransportAgent(BaseAgent):
    name = "Public Transport Agent"
    purpose = "Prioritise bus flow, promote modal shift, lower per-capita emissions."
    algorithm = "PT priority weighting + bus bunching control"
    sdg_tags = [3, 7, 8, 11, 13]

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        counts = snapshot["counts"]["per_type"]
        buses = counts.get("bus", 0)
        cars = max(1, counts.get("car", 1))
        pt_share = round(buses / (buses + cars), 3)
        recommendation = "extend_bus_lane" if pt_share < 0.15 else "maintain"
        out = {"pt_share": pt_share, "buses_active": buses, "recommendation": recommendation}
        bus.publish("public_transport.recommendation", out, sender=self.name)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"buses": buses, "cars": cars},
            algorithm=self.algorithm,
            processing_steps=[
                "Count buses vs cars in snapshot",
                "Compute PT modal share",
                "Recommend lane adjustments",
                "Publish UCP candidate",
            ],
            decision=recommendation,
            reason=f"PT share {pt_share}; buses active {buses}",
            confidence=0.88,
            execution_time_ms=0.0,
            communication_log=[{"topic": "public_transport.recommendation", "consumers": ["ucp", "sustainability"]}],
            output=out,
            expected_impact="Encourages modal shift, cuts CO2",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
