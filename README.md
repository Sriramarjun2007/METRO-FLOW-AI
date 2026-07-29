# METRO-FLOW AI

> **Enterprise Urban Intelligence Operating System**
> Multi-Agent AI · Physics-based Digital Twin · Real-time Analytics · UCP

A production-quality Smart City platform that drives every dashboard, chart,
prediction and alert from a deterministic physics-based traffic simulator and a
team of 20 specialised AI agents communicating under the **Urban Consensus
Protocol (UCP)**.

---

## Highlights

- **20 modular AI agents** — each in its own Python file with full execution
  metadata (input, algorithm, processing steps, decision, reason, confidence,
  execution time, communication log, output, expected impact, status, health).
- **Deterministic, physics-based UrbanVerse simulator** — 3×3 intersection
  grid, 12 inbound lanes, 11 vehicle types, 11 scenarios (morning rush,
  evening rush, heavy rain, accident, road block, festival, school zone, VIP
  movement, emergency corridor, construction zone, normal).
- **Real Urban Consensus Protocol** — Observe → Analyze → Share → Negotiate →
  Consensus → Shadow Simulation → Approve → Execute → Explain, including
  Dynamic Priority Aging to prevent starvation, deadlock/gridlock
  detection, and collision scanning.
- **Algorithms engine** — 15 algorithms fully documented in the Algorithms
  page (YOLOv8, OpenCV, UCP, DPA, Deadlock, Gridlock, Neighbor Coordination,
  Density, Sensor Trust, Queue Optimization, Digital Twin Diff, Dijkstra,
  A*, Time-Series Prediction, Collision Detection).
- **3D Digital Twin** — Three.js scene with buildings, trees, roads,
  traffic lights with animated colors, live vehicles whose color and blink
  rate follow the simulator, day/night toggle, rain overlay, animated
  cameras.
- **Agent Communication graph** — animated React Flow topology with
  click-to-inspect per-agent side panel.
- **Voice Assistant** — floating chat + browser voice recognition that
  answers natural-language questions about queues, congestion, consensus,
  green corridors.
- **Reports** — downloadable PDF / CSV / JSON for Traffic, Environmental,
  Agent, Signal, Emergency, Prediction reports.
- **Sustainability** — CO₂ saved, fuel economy, SDG alignment scoring for
  SDG 3, 7, 8, 9, 11, 12, 13, 17.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│            React 18 · Vite · Tailwind · Glassmorphism │
└────────────────────────────────────────────────────────┘
                       ▲     │
            WebSocket   │     │ REST
                       │     ▼
┌──────────────────────────────────────────────────────┐
│                FastAPI · asyncio                     │
│  /ws  /api/snapshot  /api/agents  /api/alerts ...    │
└────────────────────────────────────────────────────────┘
                       ▲     │
                       │     ▼
┌──────────────────────────────────────────────────────┐
│              Orchestrator · MessageBus               │
│     runs 20 agents in dependency order each tick     │
└────────────────────────────────────────────────────────┘
                       ▲     │
                       │     ▼
┌──────────────────────────────────────────────────────┐
│       UrbanVerse · 11 scenarios · 11 vehicle types   │
│     physics:    lane following · signal crossing     │
│                 spillback · emergency corridors      │
└────────────────────────────────────────────────────────┘
```

## Folder structure (matches spec)

```
backend/
├── agents/                # 20 AI agents — one file per agent
│   ├── vision_agent.py
│   ├── traffic_state_agent.py
│   ├── sensor_trust_agent.py
│   ├── weather_agent.py
│   ├── intersection_controller_agent.py
│   ├── neighbor_coordination_agent.py
│   ├── emergency_response_agent.py
│   ├── public_transport_agent.py
│   ├── event_management_agent.py
│   ├── prediction_agent.py
│   ├── sustainability_agent.py
│   ├── shadow_city_agent.py
│   ├── urban_consensus_agent.py
│   ├── explainable_ai_agent.py
│   ├── dashboard_agent.py
│   ├── urbanverse_ai.py
│   ├── alert_agent.py
│   ├── route_optimization_agent.py
│   ├── safety_guard_agent.py
│   ├── analytics_agent.py
│   └── base_agent.py
├── simulation/           # physics simulator
│   ├── urbanverse.py
│   ├── intersections.py
│   └── vehicles.py
├── algorithms/           # algorithms engine
│   ├── ucp.py            # Urban Consensus Protocol
│   ├── pathfinding.py    # Dijkstra + A*
│   ├── prediction.py     # forecaster & helpers
│   └── traffic.py        # DPA, deadlock, gridlock, spillback, queue opt, twin diff
├── services/
│   └── orchestrator.py
├── api/
│   └── main.py            # FastAPI · REST + WebSocket
└── tests/
    └── test_system.py     # 7 verification tests (all pass)

frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── hooks/useLiveStream.js
    ├── components/
    │   ├── layout/{Sidebar,Topbar,VoiceFAB}.jsx
    │   ├── ui/{KpiTile,Section}.jsx
    │   └── charts/ChartFrame.jsx
    └── pages/
        ├── DashboardPage.jsx
        ├── SimulationPage.jsx
        ├── TwinPage.jsx
        ├── AgentsPage.jsx
        ├── FlowPage.jsx
        ├── PredictionPage.jsx
        ├── AnalyticsPage.jsx
        ├── AlgorithmsPage.jsx
        ├── HistoryPage.jsx
        ├── AlertsPage.jsx
        ├── ReportsPage.jsx
        └── SettingsPage.jsx
```

## Run locally

```bash
# Backend (Python 3.11+)
pip install fastapi uvicorn[standard] pydantic
PYTHONPATH=. uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd frontend
npm install
npm run dev
# open http://localhost:5173
```

The frontend dev server proxies `/api` and `/ws` to `http://localhost:8000`.

## Verification

`backend/tests/test_system.py` covers:

```
PASS  test_all_20_agents_initialize
PASS  test_simulator_deterministic
PASS  test_simulator_snapshot_shape
PASS  test_scenario_change
PASS  test_orchestrator_tick
PASS  test_agent_results_shape
PASS  test_bus_topics_published

7/7 tests passed
```

## What "drives everything" means

Every value the dashboard shows is computed from a tick of the UrbanVerse
engine plus the consensus verdict of the 20 agents. No card, chart, alert
or prediction uses fabricated / standalone numbers — flip the scenario
dropdown and watch every KPI shift because the agent pipeline changed
its mind.

## Sidebar

Live Dashboard · Live Simulation · 3D Digital Twin · AI Agents ·
Agent Communication · Prediction · Analytics · Algorithms ·
Traffic History · Alerts · Reports · Settings · Voice Assistant (FAB)
