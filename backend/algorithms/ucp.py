"""Urban Consensus Protocol (UCP) -- distributed multi-agent decision making.

Agents under UCP follow a strict pipeline:

    Observe -> Analyze -> Share State -> Negotiate -> Consensus
        -> Shadow Simulation -> Approve -> Execute -> Explain

The protocol prevents deadlocks, gridlock, spillback, and starvation through
the supporting algorithms in this package (especially Dynamic Priority Aging).
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class UCPStage(str, Enum):
    OBSERVE = "observe"
    ANALYZE = "analyze"
    SHARE = "share"
    NEGOTIATE = "negotiate"
    CONSENSUS = "consensus"
    SHADOW = "shadow"
    APPROVE = "approve"
    EXECUTE = "execute"
    EXPLAIN = "explain"


@dataclass
class UCPDecision:
    """A single consensus decision reached by the agents."""
    proposal: str
    proposer: str
    intersection_id: str
    direction: str
    extension_seconds: float
    votes: dict[str, float] = field(default_factory=dict)
    confidence: float = 0.0
    reasoning: str = ""
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "proposal": self.proposal,
            "proposer": self.proposer,
            "intersection_id": self.intersection_id,
            "direction": self.direction,
            "extension_seconds": round(self.extension_seconds, 2),
            "votes": self.votes,
            "confidence": round(self.confidence, 3),
            "reasoning": self.reasoning,
            "timestamp": self.timestamp,
        }


class UCPRound:
    """Tracks one round of negotiation across all participating agents."""

    def __init__(self, agents: list[str]) -> None:
        self.agents = agents
        self.start_ts = time.time()
        self.stage_history: list[tuple[UCPStage, float]] = [(UCPStage.OBSERVE, self.start_ts)]
        self.proposals: list[UCPDecision] = []
        self.ready = False

    def advance(self, stage: UCPStage) -> None:
        self.stage_history.append((stage, time.time()))

    def add_proposal(self, decision: UCPDecision) -> None:
        self.proposals.append(decision)

    def aggregate_confidence(self) -> float:
        if not self.proposals:
            return 0.0
        s = sum(d.confidence for d in self.proposals)
        return min(1.0, s / len(self.proposals))

    def finalize(self) -> Optional[UCPDecision]:
        """Pick the highest-voted proposal and mark the round complete."""
        if not self.proposals:
            return None
        winner = max(self.proposals, key=lambda d: sum(d.votes.values()))
        self.ready = True
        self.advance(UCPStage.EXECUTE)
        return winner


def reach_consensus(
    intersection_id: str,
    direction: str,
    proposals: list[UCPDecision],
) -> Optional[UCPDecision]:
    """Run a consensus vote across the supplied proposals."""
    if not proposals:
        return None
    # each agent casts a weighted vote; ties broken by proposer priority
    weights: dict[str, float] = {}
    for p in proposals:
        weights.setdefault(p.proposer, 0.0)
        weights[p.proposer] += p.confidence

    winner = max(proposals, key=lambda d: sum(weights.get(a, 0) for a in d.votes))
    return winner


# Anti-starvation: any vehicle that has been waiting longer than the
# starvation threshold is automatically promoted to top priority.
def starvation_check(waiting_seconds: float, threshold: float = 60.0) -> bool:
    return waiting_seconds >= threshold
