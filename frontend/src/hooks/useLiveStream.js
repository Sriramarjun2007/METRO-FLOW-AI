import { useEffect, useRef, useState, useCallback } from "react";

// Hook: maintains a live WebSocket connection to the backend orchestrator
// and exposes the latest snapshot, agent results, alerts, and predictions.
export function useLiveStream() {
  const [connected, setConnected] = useState(false);
  const [last, setLast] = useState(null);
  const [agents, setAgents] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [scenario, setScenario] = useState("normal");
  const [alerts, setAlerts] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const ringRef = useRef([]); // last N snapshots for history
  const wsRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [snapR, agR, scR, alR, prR] = await Promise.all([
        fetch("/api/snapshot").then((r) => r.json()),
        fetch("/api/agents").then((r) => r.json()),
        fetch("/api/scenarios").then((r) => r.json()),
        fetch("/api/alerts").then((r) => r.json()),
        fetch("/api/prediction").then((r) => r.json()),
      ]);
      if (snapR?.tick) setLast(snapR);
      if (Array.isArray(agR)) setAgents(agR);
      // pull KPI bundle from Dashboard Agent
      const dash = Array.isArray(agR) ? agR.find((a) => a.agent_name === "Dashboard Agent") : null;
      if (dash?.output) setKpis(dash.output);
      if (Array.isArray(scR)) setScenarios(scR);
      if (snapR?.scenario) setScenario(snapR.scenario);
      if (alR?.alerts) setAlerts(alR.alerts);
      if (prR && Object.keys(prR).length) setPrediction(prR);
    } catch (e) {
      // ignore — connection is best-effort
    }
  }, []);

  useEffect(() => {
    let timerId;
    refresh();
    timerId = setInterval(refresh, 1500);

    // try web socket
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${proto}://${window.location.host}/ws`;
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onerror = () => setConnected(false);
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.snapshot) setLast(data.snapshot);
          if (Array.isArray(data.agents)) setAgents(data.agents);
          if (data.snapshot?.scenario) setScenario(data.snapshot.scenario);
          // append to ring buffer
          ringRef.current = [...ringRef.current, data].slice(-180);
        } catch (e) {
          // ignore malformed frames
        }
      };
    } catch (e) {
      setConnected(false);
    }
    return () => {
      clearInterval(timerId);
      try { ws?.close(); } catch (_) {}
    };
  }, [refresh]);

  const setScenarioAndSend = useCallback(async (s) => {
    setScenario(s);
    try {
      await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: s }),
      });
    } catch (e) { /* ignore */ }
  }, []);

  const ring = ringRef.current; // for HistoryPage consumers

  return { connected, last, agents, kpis, scenarios, scenario, setScenario: setScenarioAndSend, alerts, prediction, ring, refresh };
}
