"""Base class for all 20 METRO-FLOW AI agents.

Every agent implements a single ``run(snapshot) -> AgentResult`` method that
is invoked by the orchestrator each simulation tick. Agents emit a fully
populated ``AgentResult`` (decision, reason, confidence, ...) so the
dashboard's 12-tile agent card can render uniformly.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentResult:
    """All agents return this structure so the UI can render uniformly."""
    agent_id: str
    agent_name: str
    purpose: str
    input: dict
    algorithm: str
    processing_steps: list[str]
    decision: str
    reason: str
    confidence: float
    execution_time_ms: float
    communication_log: list[dict] = field(default_factory=list)
    output: dict = field(default_factory=dict)
    expected_impact: str = ""
    status: str = "idle"
    health: str = "healthy"
    last_run_ts: float = field(default_factory=time.time)
    sdg_tags: list[int] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "purpose": self.purpose,
            "input": self.input,
            "algorithm": self.algorithm,
            "processing_steps": self.processing_steps,
            "decision": self.decision,
            "reason": self.reason,
            "confidence": round(self.confidence, 3),
            "execution_time_ms": round(self.execution_time_ms, 3),
            "communication_log": self.communication_log[-10:],
            "output": self.output,
            "expected_impact": self.expected_impact,
            "status": self.status,
            "health": self.health,
            "last_run_ts": self.last_run_ts,
            "sdg_tags": self.sdg_tags,
        }


class BaseAgent:
    """Skeleton for the 20 METRO-FLOW AI agents."""

    name: str = "BaseAgent"
    purpose: str = ""
    algorithm: str = ""
    sdg_tags: list[int] = []

    def __init__(self) -> None:
        self.id = f"A-{uuid.uuid4().hex[:8].upper()}"
        self.last_result: AgentResult | None = None
        self.history: list[AgentResult] = []

    def run(self, snapshot: dict, bus: "MessageBus") -> AgentResult:
        """Sub-classes override ``_run``; this template wires up the result."""
        t0 = time.time()
        try:
            payload = self._run(snapshot, bus)
        except Exception as exc:  # defensive
            payload = AgentResult(
                agent_id=self.id,
                agent_name=self.name,
                purpose=self.purpose,
                input={},
                algorithm=self.algorithm,
                processing_steps=["unexpected error"],
                decision="noop",
                reason=str(exc),
                confidence=0.0,
                execution_time_ms=(time.time() - t0) * 1000.0,
                status="error",
                health="degraded",
                sdg_tags=list(self.sdg_tags),
            )
        payload.execution_time_ms = (time.time() - t0) * 1000.0
        payload.last_run_ts = time.time()
        payload.status = payload.status or "ok"
        payload.health = payload.health or "healthy"
        self.last_result = payload
        self.history.append(payload)
        if len(self.history) > 100:
            self.history = self.history[-100:]
        return payload

    def _run(self, snapshot: dict, bus: "MessageBus") -> AgentResult:
        raise NotImplementedError


class MessageBus:
    """Lightweight pub/sub used by agents to communicate under UCP."""

    def __init__(self) -> None:
        self.topics: dict[str, list[dict]] = {}
        self.delivered: list[dict] = []

    def publish(self, topic: str, payload: dict, sender: str) -> None:
        msg = {"topic": topic, "payload": payload, "sender": sender, "ts": time.time()}
        self.topics.setdefault(topic, []).append(msg)
        self.delivered.append(msg)
        # bound log
        if len(self.delivered) > 500:
            self.delivered = self.delivered[-500:]
        if len(self.topics[topic]) > 200:
            self.topics[topic] = self.topics[topic][-200:]

    def history(self, topic: str = "") -> list[dict]:
        if topic:
            return list(self.topics.get(topic, []))
        return list(self.delivered)

    def snapshot(self) -> dict:
        return {topic: list(msgs)[-5:] for topic, msgs in self.topics.items()}
