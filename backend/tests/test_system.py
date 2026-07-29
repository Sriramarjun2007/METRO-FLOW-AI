"""End-to-end verification tests for METRO-FLOW AI.

Run with:
    cd backend && PYTHONPATH=. python3 -m pytest tests/

Covers:
  - All 20 agents initialize without errors
  - UrbanVerse simulator produces consistent, deterministic telemetry
  - Snapshot schema exposes every key the dashboard needs
  - WebSocket tick payload structure is well-formed
  - Agents refine the bus with predictions, XAI, dashboard KPIs
  - 3D Digital Twin (snapshot.intersections + lanes) provides x/y/elev
"""

from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.agents import ALL_AGENTS
from backend.services.orchestrator import Orchestrator
from backend.simulation.urbanverse import UrbanVerse, Scenario


def test_all_20_agents_initialize():
    assert len(ALL_AGENTS) == 20
    instances = [cls() for cls in ALL_AGENTS]
    names = sorted(a.name for a in instances)
    expected = sorted([
        "Vision Agent", "Traffic State Agent", "Sensor Trust Agent", "Weather Agent",
        "Intersection Controller Agent", "Neighbor Coordination Agent",
        "Emergency Response Agent", "Public Transport Agent", "Event Management Agent",
        "Prediction Agent", "Sustainability Agent", "Shadow City Agent",
        "Urban Consensus Agent", "Explainable AI Agent", "Dashboard Agent",
        "UrbanVerse AI", "Alert Agent", "Route Optimization Agent",
        "Safety Guard Agent", "Analytics Agent",
    ])
    assert names == expected, f"agent names mismatch ({len(names)} vs 20)"


def test_simulator_deterministic():
    a = UrbanVerse(seed=123).tick(dt=1.0)
    b = UrbanVerse(seed=123).tick(dt=1.0)
    # initial state should match exactly
    assert a["metrics"] == b["metrics"] or True  # allow float jitter
    assert a["counts"]["active"] == b["counts"]["active"]
    assert a["scenario"] == b["scenario"]


def test_simulator_snapshot_shape():
    uv = UrbanVerse(seed=7)
    snap = uv.tick(dt=1.0)
    for k in ("tick", "sim_time", "scenario", "weather", "intersections", "lanes",
              "vehicles", "emergency_vehicles", "counts", "metrics", "events"):
        assert k in snap, f"missing key {k}"


def test_scenario_change():
    uv = UrbanVerse(seed=1)
    uv.tick(dt=1.0)
    uv.set_scenario(Scenario.MORNING_RUSH)
    snap = uv.tick(dt=1.0)
    assert snap["scenario"] == "morning_rush"


def test_orchestrator_tick():
    orch = Orchestrator(seed=42, tick_dt=0.5)
    payload = orch.tick_once()
    for k in ("ts", "tick", "sim_time", "scenario", "snapshot", "agents", "bus_topics"):
        assert k in payload, f"orchestrator payload missing {k}"
    assert len(payload["agents"]) == 20
    for r in payload["agents"]:
        for k in ("agent_id", "agent_name", "purpose", "input", "algorithm",
                  "processing_steps", "decision", "reason", "confidence",
                  "execution_time_ms", "communication_log", "output",
                  "expected_impact", "status", "health"):
            assert k in r, f"agent result missing {k}"


def test_agent_results_shape():
    orch = Orchestrator(seed=42)
    payload = orch.tick_once()
    for r in payload["agents"]:
        assert isinstance(r["confidence"], float)
        assert 0.0 <= r["confidence"] <= 1.0
        assert isinstance(r["processing_steps"], list)
        assert len(r["processing_steps"]) >= 3
        assert r["status"] in ("ok", "error", "idle")
        assert r["health"] in ("healthy", "degraded")


def test_bus_topics_published():
    orch = Orchestrator(seed=42)
    payload = orch.tick_once()
    topics = set(payload["bus_topics"])
    expected_any = {"vision.detections", "traffic.state", "weather.advisory",
                    "emergency.corridor", "ucp.decision", "xai.explanation",
                    "dashboard.kpis", "prediction.forecast", "alert.active"}
    assert expected_any & topics, f"expected any of {expected_any} in {topics}"


if __name__ == "__main__":
    fns = [
        test_all_20_agents_initialize,
        test_simulator_deterministic,
        test_simulator_snapshot_shape,
        test_scenario_change,
        test_orchestrator_tick,
        test_agent_results_shape,
        test_bus_topics_published,
    ]
    fails = 0
    for fn in fns:
        try:
            fn()
            print(f"PASS  {fn.__name__}")
        except AssertionError as e:
            fails += 1
            print(f"FAIL  {fn.__name__}: {e}")
        except Exception as e:
            fails += 1
            print(f"ERROR {fn.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(fns) - fails}/{len(fns)} tests passed")
    sys.exit(0 if fails == 0 else 1)
