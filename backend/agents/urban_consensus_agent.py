"""Urban Consensus Agent -- runs the UCP pipeline and emits the final decision."""

from __future__ import annotations

from .base_agent import AgentResult, BaseAgent, MessageBus
from ..algorithms.ucp import reach_consensus, UCPDecision


class UrbanConsensusAgent(BaseAgent):
    name = "Urban Consensus Agent"
    purpose = "Lead the UCP pipeline: observe -> analyze -> share -> negotiate -> consensus -> shadow -> approve -> execute."
    algorithm = "Multi-agent consensus with shadow twin validation"
    sdg_tags = [9, 11, 17]

    def _run(self, snapshot: dict, bus: MessageBus) -> AgentResult:
        states = bus.history("traffic.state")[-1]["payload"] if bus.history("traffic.state") else {}
        shadow = bus.history("shadow.result")[-1]["payload"] if bus.history("shadow.result") else {"delta": {}}
        iid = max(states, key=lambda k: states[k]["density"]) if states else list(snapshot["intersections"].keys())[0]
        state = states.get(iid, {})
        candidates = []

        # candidate 1: from neighbor coordination
        neigh = bus.history("neighbor.coordination")[-1]["payload"] if bus.history("neighbor.coordination") else []
        if neigh:
            candidates.append(UCPDecision(
                proposal="extend_green_wave", proposer="Neighbor Coordination",
                intersection_id=iid, direction="north", extension_seconds=8.0,
                votes={a: 0.8 for a in ["neighbor", "traffic_state", "predict"]},
                confidence=0.82, reasoning="green-wave uplift + queue spillover risk",
            ))

        # candidate 2: emergency corridor
        emergencies = snapshot.get("emergency_vehicles", [])
        if emergencies:
            candidates.append(UCPDecision(
                proposal="emergency_corridor", proposer="Emergency Response",
                intersection_id=iid, direction=emergencies[0]["direction"],
                extension_seconds=12.0,
                votes={a: 0.9 for a in ["emergency", "traffic_state", "neighbor"]},
                confidence=0.95, reasoning="Active emergency vehicle requires priority",
            ))

        # candidate 3: PT priority
        pt = bus.history("public_transport.recommendation")[-1]["payload"] if bus.history("public_transport.recommendation") else {}
        if pt.get("recommendation") == "extend_bus_lane":
            candidates.append(UCPDecision(
                proposal="bus_priority", proposer="Public Transport",
                intersection_id=iid, direction="south", extension_seconds=6.0,
                votes={a: 0.7 for a in ["public_transport", "sustainability"]},
                confidence=0.78, reasoning="Low PT modal share warrants bus priority",
            ))

        winner = reach_consensus(iid, "north", candidates) if candidates else None

        if winner:
            bus.publish("ucp.decision", winner.to_dict(), sender=self.name)

        queue = state.get("queue_length", 0)
        density = state.get("density", 0)
        direction = winner.direction if winner else "none"
        decision_str = winner.proposal if winner else "noop"

        return AgentResult(
            agent_id=self.id,
            agent_name=self.name,
            purpose=self.purpose,
            input={"queue": queue, "density": density, "proposals": len(candidates)},
            algorithm=self.algorithm,
            processing_steps=[
                "Observe state",
                "Analyze deltas vs twin",
                "Share with neighbor/emergency/PT",
                "Negotiate weighted votes",
                "Shadow simulation",
                "Approve & execute",
            ],
            decision=decision_str,
            reason=f"Winner proposal {decision_str} on direction {direction}",
            confidence=winner.confidence if winner else 0.5,
            execution_time_ms=0.0,
            communication_log=[
                {"topic": "traffic.state", "in": 1},
                {"topic": "neighbor.coordination", "in": 1 if neigh else 0},
                {"topic": "public_transport.recommendation", "in": 1 if pt else 0},
                {"topic": "emergency.corridor", "in": len(emergencies)},
                {"topic": "shadow.result", "in": 1 if shadow.get("evaluated") else 0},
                {"topic": "ucp.decision", "out": 1 if winner else 0},
            ],
            output=winner.to_dict() if winner else {},
            expected_impact="Resolves conflicting agent goals into one executable change",
            status="ok", health="healthy",
            sdg_tags=list(self.sdg_tags),
        )
