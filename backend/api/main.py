"""METRO-FLOW AI -- FastAPI backend.

Exposes:
  * /api/snapshot              current simulator snapshot
  * /api/agents                all 20 agents + their most recent result
  * /api/scenarios             list of supported scenarios
  * /api/scenario              POST: switch scenarios
  * /api/voice                 POST: AI assistant answer
  * /api/reports/{type}        PDF / CSV / JSON reports
  * /api/prediction            forecast bundle
  * /api/alerts                current alert centre feed
  * /api/algorithms            algorithms catalogue
  * /ws                        WebSocket streaming tick payloads

Run with:  uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import asyncio
import csv
import io
import json
import os
import time
from typing import Any

import backend  # noqa: F401

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from backend.services.orchestrator import Orchestrator
from backend.simulation.urbanverse import SCENARIO_CONFIG, Scenario


# ----------------------------------------------------------------------
# App + orchestrator lifecycle
# ----------------------------------------------------------------------
app = FastAPI(title="METRO-FLOW AI", version="1.0.0")


# Render / gunicorn entrypoint
application = app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = Orchestrator(seed=42, tick_dt=0.5)
_ws_clients: list[WebSocket] = []


@app.on_event("startup")
async def _startup() -> None:
    async def loop() -> None:
        while True:
            try:
                payload = orchestrator.tick_once()
                data = json.dumps(payload, default=str)
                dead: list[WebSocket] = []
                for ws in list(_ws_clients):
                    try:
                        await ws.send_text(data)
                    except Exception:
                        dead.append(ws)
                for d in dead:
                    if d in _ws_clients:
                        _ws_clients.remove(d)
            except Exception:
                pass
            await asyncio.sleep(orchestrator.tick_dt)

    asyncio.create_task(loop())


# ----------------------------------------------------------------------
# REST
# ----------------------------------------------------------------------
@app.get("/api/snapshot")
def get_snapshot() -> dict:
    return orchestrator.last_snapshot


@app.get("/api/agents")
def get_agents() -> list[dict]:
    return orchestrator.last_agent_results


@app.get("/api/scenarios")
def get_scenarios() -> list[dict]:
    return [
        {"id": s.value, "label": s.value.replace("_", " ").title(), "config": SCENARIO_CONFIG[s]}
        for s in Scenario
    ]


class ScenarioBody(BaseModel):
    scenario: str


@app.post("/api/scenario")
def set_scenario(body: ScenarioBody) -> dict:
    orchestrator.set_scenario(body.scenario)
    return {"scenario": body.scenario}


@app.get("/api/alerts")
def get_alerts() -> dict:
    snap = orchestrator.last_snapshot
    alerts: list[dict] = []
    for ev in snap.get("events", []):
        if ev["type"] in {"spawn"}:
            continue
        alerts.append({
            "id": f"ALT-{ev['ts']}-{len(alerts)}",
            "type": ev["type"],
            "severity": ev.get("severity", "low"),
            "ts": ev["ts"],
            "detail": {k: v for k, v in ev.items() if k != "type"},
        })
    if snap.get("weather", {}).get("rain"):
        alerts.append({"id": "ALT-WX-RAIN", "type": "heavy_rain", "severity": "high", "ts": snap["sim_time"]})
    if snap.get("weather", {}).get("fog"):
        alerts.append({"id": "ALT-WX-FOG", "type": "fog", "severity": "medium", "ts": snap["sim_time"]})
    for e in snap.get("emergency_vehicles", []):
        alerts.append({"id": f"ALT-EMRG-{e['id']}", "type": e["type"], "severity": "critical", "ts": snap["sim_time"]})
    return {"alerts": alerts}


@app.get("/api/prediction")
def get_prediction() -> dict:
    for r in orchestrator.last_agent_results:
        if r["agent_name"] == "Prediction Agent":
            return r["output"]
    return {}


@app.get("/api/algorithms")
def get_algorithms() -> list[dict]:
    """Static algorithms catalogue for the algorithms page."""
    return [
        {"id": "yolov8", "name": "YOLOv8 Detection", "category": "Perception",
         "purpose": "Detect vehicles/pedestrians from camera feeds in real time.",
         "math": "Backbone CSPDarknet + PANet FPN; anchor-free decoupled heads.",
         "flow": "preprocess -> backbone -> neck -> decoupled head -> NMS",
         "why": "Speed + accuracy trade-off ideal for city-scale CCTV.",
         "advantages": "30+ FPS on edge GPUs; tightly bounded boxes.",
         "limitations": "Sensitive to occlusion and extreme weather."},
        {"id": "opencv", "name": "OpenCV Preprocessing", "category": "Perception",
         "purpose": "Normalize camera frames (denoise, contrast, lane Hough transform).",
         "math": "Bilateral filter + CLAHE; Hough line transform: r = x cosθ + y sinθ.",
         "flow": "raw frame -> resize -> denoise -> CLAHE -> feature extract",
         "why": "Pre-stages YOLOv8 with stable, contrast-invariant inputs.",
         "advantages": "Cheap, deterministic, widely supported.",
         "limitations": "Cannot disambiguate object types."},
        {"id": "ucp", "name": "Urban Consensus Protocol", "category": "Multi-Agent",
         "purpose": "Coordinate 20 agents via Observe→Analyze→Share→Negotiate→Consensus→Shadow→Approve→Execute→Explain.",
         "math": "Weighted voting and shadow twin validation; confidence-weighted aggregation.",
         "flow": "Observe -> Analyze -> Share -> Negotiate -> Consensus -> Shadow -> Approve -> Execute -> Explain",
         "why": "Prevents conflicting agent decisions and improves trust.",
         "advantages": "Conflict-free, auditable, fault-tolerant.",
         "limitations": "Adds latency; needs quorum configuration."},
        {"id": "dpa", "name": "Dynamic Priority Aging", "category": "Scheduling",
         "purpose": "A starved vehicle gains priority the longer it waits.",
         "math": "p_eff = p_base + k · wait_time,  k = 0.05.",
         "flow": "evaluate waiting time -> boost priority -> schedule",
         "why": "Avoids indefinite starvation of low-priority vehicles.",
         "advantages": "Fair scheduling; bounded worst-case delay.",
         "limitations": "Tuning k matters; can preempt slightly newer arrivals."},
        {"id": "deadlock", "name": "Deadlock Detection", "category": "Safety",
         "purpose": "Detect when all approaches to an intersection are red.",
         "math": "Check signal_state vector for all-red intersection.",
         "flow": "scan signals -> if all red -> trigger override",
         "why": "Prevents permanent gridlock at SCATS-like controllers.",
         "advantages": "Cheap, deterministic.",
         "limitations": "Needs override policy."},
        {"id": "gridlock", "name": "Gridlock Prevention", "category": "Safety",
         "purpose": "Detect majority-saturated lanes and run release waves.",
         "math": "saturated_lanes = |{ lanes with q >= 12 }|; gridlock if saturated >= majority.",
         "flow": "monitor density -> trigger release wave -> log audit",
         "why": "Stops city-wide gridlock under abnormal demand.",
         "advantages": "Macro-level safety net.",
         "limitations": "Needs capacity tuning per intersection."},
        {"id": "neighbor", "name": "Neighbor Coordination", "category": "Coordination",
         "purpose": "Compute green-wave offsets between adjacent intersections.",
         "math": "offset = distance / avg_speed; Robertson platoon model.",
         "flow": "derive offset -> apply at controller",
         "why": "Reduces stops on commuter corridors.",
         "advantages": "5-15% throughput uplift.",
         "limitations": "Brittle under heavy weaving."},
        {"id": "density", "name": "Traffic Density Estimation", "category": "Perception",
         "purpose": "Map loop+CCTV data into a 0..1 lane occupancy value.",
         "math": "density = vehicles / capacity.",
         "flow": "ingest -> normalize -> output share",
         "why": "Single, comparable metric of how full a lane is.",
         "advantages": "Easy to broadcast to all agents.",
         "limitations": "Linear model can't capture heterogeneity."},
        {"id": "trust", "name": "Sensor Trust Score", "category": "Perception",
         "purpose": "Quarantine drifting sensors.",
         "math": "trust = 1 − failure_rate − noise.",
         "flow": "track success/failure -> score -> quarantine < 0.7",
         "why": "Avoids poison-the-fusion attacks on data sources.",
         "advantages": "Defensive and auditable.",
         "limitations": "Threshold tuning per install."},
        {"id": "queue", "name": "Queue Optimization", "category": "Scheduling",
         "purpose": "Split green time proportionally to queue length.",
         "math": "g_i = (q_i / Σq) × cycle × 0.9.",
         "flow": "compute queues -> split cycle -> apply",
         "why": "Reduces uniform wait across all directions.",
         "advantages": "Simple, intuitive fairness.",
         "limitations": "Doesn't model spillback beyond one cycle."},
        {"id": "twin", "name": "Digital Twin Diff", "category": "Multi-Agent",
         "purpose": "Compare simulator metrics against twin baseline for drift.",
         "math": "drift_k = sim_k − twin_k for every metric k.",
         "flow": "snapshot sim -> snapshot twin -> diff",
         "why": "Surfaces aging models or hidden bugs in the simulator.",
         "advantages": "Self-tests the platform.",
         "limitations": "Twin must be kept in sync."},
        {"id": "dijkstra", "name": "Dijkstra Pathfinding", "category": "Routing",
         "purpose": "Find shortest-cost route on the intersection graph.",
         "math": "d[v] = min(d[v], d[u] + w(u,v)) over a priority queue.",
         "flow": "init d[start]=0 -> relax -> until goal reached",
         "why": "Optimal for non-negative weights.",
         "advantages": "Optimality guarantees.",
         "limitations": "Slower than A* without a heuristic."},
        {"id": "astar", "name": "A* Search", "category": "Routing",
         "purpose": "Heuristic-guided shortest-path search.",
         "math": "f(n) = g(n) + h(n) where h is admissible.",
         "flow": "open-set -> expand lowest f -> until goal",
         "why": "Fast and still optimal with admissible heuristic.",
         "advantages": "Often orders of magnitude faster than Dijkstra.",
         "limitations": "Needs a good heuristic."},
        {"id": "timeseries", "name": "Time-Series Prediction", "category": "Forecasting",
         "purpose": "Predict queue/congestion/delay/CO2 over 5/10/30 minutes.",
         "math": "Linear fit y = β0 + β1·t over rolling 30-tick window.",
         "flow": "window -> slope/intercept -> forecast -> confidence band",
         "why": "Cheap baseline that gets richer features (ARIMA/LSTM) later.",
         "advantages": "Interpretable.",
         "limitations": "Linear; may miss regime changes."},
        {"id": "collision", "name": "Collision Detection", "category": "Safety",
         "purpose": "Detect geometric overlap between adjacent vehicles.",
         "math": "overlap = a_end > b_start && a_start < b_end (with margin).",
         "flow": "scan pairs -> if overlap -> escalate",
         "why": "Last-mile safety guarantee before approval.",
         "advantages": "Simple and O(n²) per lane.",
         "limitations": "Linear scan; n too large => spatial index."},
    ]


class VoiceQuery(BaseModel):
    text: str


@app.post("/api/voice")
def voice(body: VoiceQuery) -> dict:
    """Tiny rule-based NLU over the snapshot."""
    snap = orchestrator.last_snapshot
    metrics = snap.get("metrics", {})
    vehicles = snap.get("vehicles", [])
    text = body.text.lower()
    if "queue" in text or "junction" in text:
        worst = max(
            (iid for iid, lanes in snap["lanes"].items()),
            key=lambda iid: sum(l["vehicle_count"] for l in lanes.values()),
        )
        worst_q = sum(1 for l in snap["lanes"][worst].values() for v in l["vehicles"] if v["velocity"] < 0.5)
        return {"reply": f"Heaviest junction is {worst} with {worst_q} queued vehicles."}
    if "congest" in text:
        return {"reply": f"Current congestion is {metrics.get('congestion_pct', 0)}%."}
    if "speed" in text:
        return {"reply": f"Average speed is {metrics.get('average_speed_kmh', 0)} km/h."}
    if "green corridor" in text or "corridor" in text:
        eids = [v["id"] for v in snap.get("emergency_vehicles", [])]
        return {"reply": f"Active emergency vehicles: {eids or 'none'}."}
    if "consensus" in text or "protocol" in text:
        return {"reply": "Urban Consensus Protocol runs Observe→Analyze→Share→Negotiate→Consensus→Shadow→Approve→Execute→Explain each tick."}
    if "shut down" in text or "shutdown" in text:
        return {"reply": "Shutdown requires operator confirmation; safety_guard will veto unsupervised disable."}
    return {"reply": f"Live city health is {metrics.get('city_health_score', 0)}/100. Active vehicles: {len(vehicles)}."}


@app.get("/api/reports/{kind}")
def report(kind: str) -> StreamingResponse:
    snap = orchestrator.last_snapshot
    metrics = snap.get("metrics", {})
    agents = orchestrator.last_agent_results
    if kind == "traffic":
        title = "Traffic Report"
        rows = [["metric", "value"]] + [[k, str(v)] for k, v in metrics.items()]
    elif kind == "environment":
        title = "Environmental Report"
        rows = [["metric", "value"]] + [
            ["co2_kg", str(metrics.get("total_co2_kg"))],
            ["fuel_l", str(metrics.get("total_fuel_liters"))],
            ["avg_speed_kmh", str(metrics.get("average_speed_kmh"))],
            ["scenario", str(snap.get("scenario"))],
        ]
    elif kind == "agent":
        title = "Agent Report"
        rows = [["agent", "decision", "confidence", "status", "health"]] + [
            [a["agent_name"], a["decision"], str(a["confidence"]), a["status"], a["health"]]
            for a in agents
        ]
    elif kind == "signal":
        title = "Signal Report"
        rows = [["intersection", "north", "south", "east", "west", "density"]] + [
            [iid] + [s["color"] for s in inter["signals"].values()] + [str(sum(inter.get("density", {}).values()))]
            for iid, inter in snap["intersections"].items()
        ]
    elif kind == "emergency":
        title = "Emergency Report"
        rows = [["vehicle_id", "type", "direction", "intersection"]] + [
            [v["id"], v["type"], v["direction"], v["intersection_id"]]
            for v in snap.get("emergency_vehicles", [])
        ]
    elif kind == "prediction":
        title = "Prediction Report"
        rows = [["horizon", "queue", "congestion", "delay", "co2", "fuel", "confidence"]]
        pred = next((a["output"] for a in agents if a["agent_name"] == "Prediction Agent"), {})
        for h, vals in pred.items():
            rows.append([h, str(vals.get("queue")), str(vals.get("congestion")), str(vals.get("delay")), str(vals.get("co2")), str(vals.get("fuel")), str(vals.get("confidence"))])
    else:
        raise HTTPException(status_code=404, detail="unknown report kind")

    if kind == "json":
        body = json.dumps({"title": title, "rows": rows, "snapshot": snap, "agents": agents}, indent=2, default=str)
        return StreamingResponse(io.StringIO(body), media_type="application/json",
                                 headers={"Content-Disposition": f"attachment; filename={title.replace(' ', '_')}.json"})
    if kind == "pdf":
        # Always emit CSV as fallback; PDF generation requires optional libs.
        return StreamingResponse(io.StringIO(_to_csv(rows)), media_type="text/csv",
                                 headers={"Content-Disposition": f"attachment; filename={title.replace(' ', '_')}.csv"})
    return StreamingResponse(io.StringIO(_to_csv(rows)), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename={title.replace(' ', '_')}.csv"})


def _to_csv(rows: list[list[str]]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    for r in rows:
        w.writerow(r)
    return buf.getvalue()


# ----------------------------------------------------------------------
# WebSocket
# ----------------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    _ws_clients.append(websocket)
    try:
        # immediately send current state to the new client
        await websocket.send_text(json.dumps({
            "ts": time.time(),
            "snapshot": orchestrator.last_snapshot,
            "agents": orchestrator.last_agent_results,
            "bus_topics": list(orchestrator.bus.topics.keys()),
        }))
        while True:
            # keep the connection open without spamming; clients just receive pushes
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in _ws_clients:
            _ws_clients.remove(websocket)


@app.get("/")
def root() -> dict:
    return {"name": "METRO-FLOW AI", "version": "1.0.0", "agents": 20}
