"""UrbanVerse AI -- the overarching persona agent that orchestrates the
20-agent set and reflects on multi-agent system health."""

from __future__ import annotations

from .base_agent import AgentResult, BaseAgent, MessageBus


class UrbanVerseAI(BaseAgent):
    name = "UrbanVerse AI"
    purpose = "Orchestrate the 20-agent ensemble and report MAS-level health."
    algorithm = "Stigmergy / market-based coordination"
    sdg_tags = [9, 11, 17]

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        topics_active = len(bus.topics)
        decisions = len(bus.history("ucp.decision"))
        health = snapshot["metrics"]["city_health_score"]
        summary = f"{topics_active} active topics, {decisions} UCP decisions, city health {health}"
        out = {"topics_active": topics_active, "ucp_decisions": decisions, "city_health": health, "summary": summary}
        bus.publish("urbanverse.summary", out, sender=self.name)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"agents_orchestrated": 20},
            algorithm=self.algorithm,
            processing_steps=[
                "Read agent bus activity",
                "Quantify topic diversity",
                "Compute city-level health",
                "Broadcast orchestration summary",
            ],
            decision="publish_summary",
            reason=summary,
            confidence=0.9,
            execution_time_ms=0.0,
            communication_log=[{"topic": "urbanverse.summary", "consumers": ["ui"]}],
            output=out,
            expected_impact="Treats the 20-agent ensemble as one orchestrator",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
