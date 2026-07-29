"""Specialized traffic algorithms: Dynamic Priority Aging, Deadlock/Gridlock
prevention, queue optimization, and Digital Twin coordination."""

from __future__ import annotations

from dataclasses import dataclass


def dynamic_priority_aging(base_priority: float, waiting_seconds: float, k: float = 0.05) -> float:
    """A vehicle's effective priority grows with waiting time so that a
    starved low-priority vehicle eventually jumps the queue."""
    return float(base_priority) + max(0.0, waiting_seconds) * k


def detect_gridlock(density_per_lane: dict[str, int], threshold: int = 12) -> bool:
    """Gridlock = a majority of lanes simultaneously saturated."""
    if not density_per_lane:
        return False
    saturated = sum(1 for v in density_per_lane.values() if v >= threshold)
    return saturated >= max(3, len(density_per_lane) // 2 + 1)


def detect_spillback(downstream_queue: int, threshold: int = 14) -> bool:
    return downstream_queue >= threshold


def detect_starvation(waiting_seconds: float, threshold: float = 90.0) -> bool:
    return waiting_seconds >= threshold


def deadlock_check(signals: dict[str, str]) -> dict[str, bool]:
    """A junction is deadlocked if all approaches are red and no path exists.

    Returns a dict describing which axes are simultaneously blocked.
    """
    n = signals.get("north", "red")
    s = signals.get("south", "red")
    e = signals.get("east", "red")
    w = signals.get("west", "red")
    return {
        "ns_blocked": n == "red" and s == "red",
        "ew_blocked": e == "red" and w == "red",
        "fully_blocked": all(v == "red" for v in (n, s, e, w)),
    }


def queue_optimization(queues: list[int], capacity: int) -> dict[str, float]:
    """Suggest green-time splits proportional to queue length."""
    total = sum(max(0, q) for q in queues) or 1
    splits = [max(0.0, q) / total for q in queues]
    total_cycle = 60.0
    greens = [round(s * total_cycle * 0.9, 1) for s in splits]  # 90% of cycle to greens
    return {"splits": splits, "greens": greens}


def digital_twin_diff(sim_metrics: dict, twin_metrics: dict) -> dict[str, float]:
    """Compare live and digital-twin metrics to surface drift."""
    diff: dict[str, float] = {}
    for k in sim_metrics:
        if k in twin_metrics:
            diff[k] = round(float(sim_metrics[k]) - float(twin_metrics[k]), 3)
    return diff


def queue_length_estimate(v_stopped: int, v_moving: int) -> float:
    """Queue length = stopped + at-risk-of-stopping moving."""
    return float(v_stopped) + 0.5 * float(v_moving)
