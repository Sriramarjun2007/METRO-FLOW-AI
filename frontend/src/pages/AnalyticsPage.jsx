import React, { useMemo } from "react";
import Section from "../components/ui/Section.jsx";
import { BarSeries, LineChartM, PieBundle, RadarBundle } from "../components/charts/ChartFrame.jsx";
import { BarChart3, TrendingUp, Users, Route as RouteIcon, Bot } from "lucide-react";

export default function AnalyticsPage({ last, agents }) {
  const counts = last?.counts || {};
  const m = last?.metrics || {};

  // Build a synthetic 30-tick series from the current snapshot for chart display.
  const series = useMemo(() => {
    const arr = [];
    const now = last?.sim_time || 0;
    for (let i = 0; i < 30; i++) {
      arr.push({
        x: i,
        speed: Math.max(2, 22 + Math.sin((now - i) / 3) * 4 - (m.congestion_pct || 0) * 0.15),
        wait: Math.max(0, (m.average_wait_seconds || 8) + Math.sin((now - i) / 2) * 3),
        queue: 4 + Math.abs(Math.sin((now - i) / 2)) * 6,
        occupancy: Math.min(95, (m.occupancy_pct || 0) + Math.sin((now - i) / 4) * 12 + i * 0.5),
        signal: Math.max(20, 100 - (m.occupancy_pct || 0) * 0.5 - i * 0.4),
        emergency: Math.max(0, Math.sin((now - i) / 3) * 2 + 1),
      });
    }
    return arr;
  }, [last, m]);

  const vehicleMix = useMemo(() =>
    Object.entries(counts.per_type || {}).map(([name, value]) => ({ name, value })),
  [counts]);

  const dirMix = useMemo(() =>
    Object.entries(counts.per_direction || {}).map(([name, value]) => ({ name, value })),
  [counts]);

  const perAgentPerf = useMemo(() => (agents || []).map((a) => ({
    name: a.agent_name.replace(" Agent", ""),
    confidence: Math.round(a.confidence * 100),
  })), [agents]);

  const radar = useMemo(() => ([
    { metric: "Speed", value: Math.min(100, (m.average_speed_kmh || 0) * 4) },
    { metric: "Health", value: m.city_health_score || 0 },
    { metric: "Air", value: Math.max(20, 100 - (m.congestion_pct || 0) * 1.2) },
    { metric: "Signal Eff.", value: Math.max(20, 100 - (m.occupancy_pct || 0) * 0.8) },
    { metric: "PT Share", value: 65 },
    { metric: "Safety", value: Math.max(20, 100 - (counts.active || 0)) },
  ]), [m, counts]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold">Analytics</h1>
        <p className="text-[12px] text-slate-400">Longitudinal KPIs · Road performance · Agent performance · Vehicle mix</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Speed & Wait" subtitle="rolling window" icon={TrendingUp}>
          <LineChartM data={series} series={[{ k: "speed", color: "#22d3a5" }, { k: "wait", color: "#ff5d7a" }]} />
        </Section>
        <Section title="Queue & Occupancy" subtitle="density curve" icon={Users}>
          <LineChartM data={series} series={[{ k: "queue", color: "#22e0ff" }, { k: "occupancy", color: "#8b5cf6" }]} />
        </Section>
        <Section title="Signal Utilization" subtitle="per-cycle efficiency" icon={BarChart3}>
          <LineChartM data={series} series={[{ k: "signal", color: "#f5b942" }]} />
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Section title="Vehicle Mix" subtitle="live" icon={RouteIcon}>
          <PieBundle data={vehicleMix.filter((d) => d.value > 0)} height={180} />
        </Section>
        <Section title="Direction Mix" subtitle="per-axis load" icon={RouteIcon}>
          <PieBundle data={dirMix.filter((d) => d.value > 0)} height={180} />
        </Section>
        <Section title="Agent Performance" subtitle="live confidence" icon={Bot}>
          <BarSeries
            data={perAgentPerf}
            x="name"
            y="confidence"
            color="#22e0ff"
            height={260}
          />
        </Section>
        <Section title="Road Health Radar" subtitle="composite" icon={BarChart3}>
          <RadarBundle data={radar} height={220} />
        </Section>
      </div>
    </div>
  );
}
