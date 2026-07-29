"""Explainable AI Agent -- turns each UCPDecision into human-readable rationale."""

from __future__ import annotations

from .base_agent import AgentResult, BaseAgent, MessageBus


class ExplainableAIAgent(BaseAgent):
    name = "Explainable AI Agent"
    purpose = "Translate the latest UCP decision into a plain-language explanation with contributing evidence."
    algorithm = "Template-based natural language generation + SHAP-style weights"
    sdg_tags = [11, 17]

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        ucp = bus.history("ucp.decision")
        if not ucp:
            explanation = "No active consensus proposal; system is in monitor mode."
            contributions = []
        else:
            d = ucp[-1]["payload"]
            explanation = (
                f"On intersection {d['intersection_id']} we extended the {d['direction']} green "
                f"by {d['extension_seconds']}s because {d['reasoning']}. "
                f"Confidence {round(d['confidence']*100,1)}% based on weighted agent votes."
            )
            contributors = d.get("votes", {})
            contributions = sorted(contributors.items(), key=lambda kv: kv[1], reverse=True)
        out = {"explanation": explanation, "contributions": contributions}
        bus.publish("xai.explanation", out, sender=self.name)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"ucp_decisions": len(ucp)},
            algorithm=self.algorithm,
            processing_steps=[
                "Fetch latest UCP record",
                "Pull per-agent vote weights",
                "Build sentence via template",
                "Publish to dashboard & reports",
            ],
            decision="publish_explanation",
            reason=explanation[:120],
            confidence=0.95,
            execution_time_ms=0.0,
            communication_log=[{"topic": "xai.explanation", "consumers": ["dashboard", "reports"]}],
            output=out,
            expected_impact="Builds operator trust in autonomous decisions",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
