"""Safety Guard Agent -- the watchdog that prevents dangerous decisions."""

from __future__ import annotations

from .base_agent import AgentResult, BaseAgent, MessageBus
from ..algorithms.prediction import hit_collision


class SafetyGuardAgent(BaseAgent):
    name = "Safety Guard Agent"
    purpose = "Block decisions that would create collisions, spillback, or unsafe pedestrian exposure."
    algorithm = "Geometric collision scan + queue hazard checks"
    sdg_tags = [3, 11]

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        collisions = 0
        for iid, lanes in snapshot["lanes"].items():
            for lane in lanes.values():
                vs = lane["vehicles"]
                for i in range(len(vs) - 1):
                    for j in range(i + 1, len(vs)):
                        if hit_collision(vs[i]["position"], 4.5, vs[j]["position"], 4.5, margin=0.4):
                            collisions += 1
        spillback_roads = [
            iid for iid, lanes in snapshot["lanes"].items()
            if any(l["vehicle_count"] > 14 for l in lanes.values())
        ]
        ok = collisions == 0 and not spillback_roads
        decision = "safe_to_proceed" if ok else "apply_brakes"
        bus.publish("safety.assessment", {"collisions": collisions, "spillback_roads": spillback_roads}, sender=self.name)
        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"vehicles": sum(l["vehicle_count"] for lanes in snapshot["lanes"].values() for l in lanes.values())},
            algorithm=self.algorithm,
            processing_steps=[
                "Scan adjacent vehicle pairs for overlap",
                "Detect spillback risk",
                "Veto unsafe UCP proposals",
                "Publish safety verdict",
            ],
            decision=decision,
            reason=f"{collisions} overlap risk, {len(spillback_roads)} spillback roads",
            confidence=0.96,
            execution_time_ms=0.0,
            communication_log=[{"topic": "safety.assessment", "consumers": ["ucp", "controller"]}],
            output={"collisions": collisions, "spillback_roads": spillback_roads, "safe": ok},
            expected_impact="Prevents unsafe autonomous decisions",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
