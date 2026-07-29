import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar.jsx";
import Topbar from "./components/layout/Topbar.jsx";
import VoiceFAB from "./components/layout/VoiceFAB.jsx";
import { useLiveStream } from "./hooks/useLiveStream.js";
import DashboardPage from "./pages/DashboardPage.jsx";
import SimulationPage from "./pages/SimulationPage.jsx";
import TwinPage from "./pages/TwinPage.jsx";
import AgentsPage from "./pages/AgentsPage.jsx";
import FlowPage from "./pages/FlowPage.jsx";
import PredictionPage from "./pages/PredictionPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import AlgorithmsPage from "./pages/AlgorithmsPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import AlertsPage from "./pages/AlertsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

export default function App() {
  const { connected, scenario, setScenario, last, agents, kpis, scenarios, alerts, prediction } =
    useLiveStream();

  useEffect(() => {
    document.title = `METRO-FLOW AI — ${scenario?.toUpperCase() || "LIVE"}`;
  }, [scenario]);

  return (
    <div className="min-h-screen flex">
      <Sidebar connected={connected} scenario={scenario} />

      <main className="flex-1 min-w-0 flex flex-col">
        <Topbar
          connected={connected}
          scenario={scenario}
          onScenario={setScenario}
          scenarios={scenarios}
          cityHealth={kpis?.city_health_score ?? last?.metrics?.city_health_score ?? 0}
        />

        <div className="flex-1 min-h-0 overflow-auto px-6 pb-12 pt-2">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage last={last} agents={agents} kpis={kpis} alerts={alerts} />} />
            <Route path="/simulation" element={<SimulationPage last={last} />} />
            <Route path="/twin" element={<TwinPage last={last} />} />
            <Route path="/agents" element={<AgentsPage agents={agents} />} />
            <Route path="/agents/flow" element={<FlowPage agents={agents} />} />
            <Route path="/prediction" element={<PredictionPage prediction={prediction} last={last} />} />
            <Route path="/analytics" element={<AnalyticsPage last={last} agents={agents} />} />
            <Route path="/algorithms" element={<AlgorithmsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/alerts" element={<AlertsPage alerts={alerts} last={last} />} />
            <Route path="/reports" element={<ReportsPage kpis={kpis} agents={agents} last={last} />} />
            <Route path="/settings" element={<SettingsPage scenario={scenario} onScenario={setScenario} scenarios={scenarios} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>

      <VoiceFAB />
    </div>
  );
}
