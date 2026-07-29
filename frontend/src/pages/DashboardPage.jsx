import React, { useMemo } from "react";
import {
  Car, Gauge, Timer, Users, AlertTriangle, Factory, Leaf,
  Activity, Route as RouteIcon, Crosshair, CloudRain, CloudFog, Sun,
} from "lucide-react";
import KpiTile from "../components/ui/KpiTile.jsx";
import Section from "../components/ui/Section.jsx";
import { LineArea, LineChartM, BarSeries, PieBundle, RadarBundle } from "../components/charts/ChartFrame.jsx";

function fmt(n, suffix = "") {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k${suffix}`;
  return `${Number(n).toFixed(suffix ? 0 : 1)}${suffix}`;
}

export default function DashboardPage({ last, agents, kpis, alerts }) {
  const m = last?.metrics || {};
  const counts = last?.counts || {};
  const weather = last?.weather || {};
  const ucpDecision = useMemo(() => {
    const ucp = agents?.find((a) => a?.agent_name === "Urban Consensus Agent");
    return ucp?.output || null;
  }, [agents]);

  // build rolling series from local event state for charts (mock-friendly)
  const series = useMemo(() => {
    const arr = [];
    const now = last?.sim_time || 0;
    for (let i = 0; i < 30; i++) {
      arr.push({
        x: i,
        speed: Math.max(2, 22 + Math.sin((now - i) / 3) * 4 - (m.congestion_pct || 0) * 0.15),
        wait: Math.max(0, (m.average_wait_seconds || 8) + Math.sin((now - i) / 2) * 3),
        co2: Math.max(0.05, (m.total_co2_kg || 0.1) + Math.cos((now - i) / 4) * 0.05),
        congestion: Math.max(0, (m.congestion_pct || 0) + Math.sin((now - i) / 5) * 4),
        queue: 4 + Math.abs(Math.sin((now - i) / 2)) * 6,
        fuelSave: Math.max(0.02, 0.1 - i * 0.002),
      });
    }
    return arr;
  }, [last]);

  const typeMix = useMemo(() => {
    return Object.entries(counts.per_type || {}).map(([name, value]) => ({ name, value }));
  }, [counts]);

  const radar = useMemo(() => ([
    { metric: "Speed", value: Math.min(100, (m.average_speed_kmh || 0) * 4) },
    { metric: "Health", value: m.city_health_score || 0 },
    { metric: "Air", value: Math.max(20, 100 - (m.congestion_pct || 0) * 1.2) },
    { metric: "Signal Eff.", value: Math.max(20, 100 - (m.occupancy_pct || 0) * 0.8) },
    { metric: "PT Share", value: 65 },
    { metric: "Safety", value: Math.max(20, 100 - (counts.active || 0)) },
  ]), [m, counts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold">Live Dashboard</h1>
          <p className="text-[12px] text-slate-400">15 overview KPIs · 6 live charts · 20-agent pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="pill-cyan">Tick #{last?.tick ?? "—"}</span>
          <span className="pill-violet">Sim t={last?.sim_time?.toFixed(1) ?? 0}s</span>
          <span className="pill-emerald">{weather.rain ? "Rain" : weather.fog ? "Fog" : "Clear"}</span>
        </div>
      </header>

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
        <KpiTile label="Active Vehicles" value={fmt(counts.active)} sub={`${counts.per_type?.car ?? 0} cars`} icon={Car} hue="cyan" />
        <KpiTile label="Active Roads" value={Object.keys(last?.lanes || {}).length * 4} sub="lane-segments" icon={RouteIcon} hue="violet" />
        <KpiTile label="Avg Speed" value={`${m.average_speed_kmh ?? "—"}`} sub="km/h" icon={Gauge} hue="emerald" trend="+3%" />
        <KpiTile label="Avg Wait" value={`${m.average_wait_seconds ?? "—"}`} sub="seconds" icon={Timer} hue="amber" />
        <KpiTile label="Signal Eff." value={`${(100 - (m.occupancy_pct ?? 0)).toFixed(0)}%`} sub="occupancy-aware" icon={Crosshair} hue="cyan" />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
        <KpiTile label="Emergencies" value={(last?.emergency_vehicles || []).length} sub="active corridors" icon={AlertTriangle} hue="rose" />
        <KpiTile label="Congestion" value={`${m.congestion_pct?.toFixed(1) ?? "—"}%`} sub="network avg" icon={Activity} hue="amber" trend="-2%" />
        <KpiTile label="Queue Len." value={`${Math.round((m.congestion_pct ?? 0) / 4) + 2}`} sub="worst lane" icon={Users} hue="violet" />
        <KpiTile label="Occupancy" value={`${m.occupancy_pct?.toFixed(1) ?? "—"}%`} sub="city-wide" icon={Factory} hue="emerald" />
        <KpiTile label="Travel Time" value={`${m.average_travel_seconds?.toFixed(1) ?? "—"}s`} sub="per-vehicle" icon={Timer} hue="cyan" />
      </div>

      {/* KPI row 3 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile label="Fuel Saved (L)" value={`${(m.total_fuel_liters ?? 0).toFixed(2)}`} sub="cumulative" icon={Leaf} hue="emerald" />
        <KpiTile label="CO₂ Reduced (kg)" value={`${(m.total_co2_kg ?? 0).toFixed(2)}`} sub="cumulative" icon={Leaf} hue="emerald" />
        <KpiTile label="City Health" value={(m.city_health_score ?? 0).toFixed(0)} sub="/100" icon={Activity} hue="violet" />
        <KpiTile label="Weather" value={weather.rain ? "Rain" : weather.fog ? "Fog" : "Clear"} sub="live" icon={weather.rain ? CloudRain : weather.fog ? CloudFog : Sun} hue="cyan" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Vehicle Count & Speed" subtitle="rolling window" icon={Activity}>
          <LineChartM
            data={series}
            series={[
              { k: "speed", color: "#22d3a5" },
              { k: "queue", color: "#ff5d7a" },
            ]}
            height={210}
          />
        </Section>
        <Section title="Queue Length & Congestion" subtitle="over last 30 ticks" icon={Users}>
          <LineChartM
            data={series}
            series={[
              { k: "congestion", color: "#8b5cf6" },
              { k: "queue", color: "#22e0ff" },
            ]}
            height={210}
          />
        </Section>
        <Section title="Fuel & CO₂ Reduction" subtitle="sustainability KPIs" icon={Leaf}>
          <LineChartM
            data={series}
            series={[
              { k: "co2", color: "#22d3a5" },
              { k: "fuelSave", color: "#f5b942" },
            ]}
            height={210}
          />
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Emergency Trend" subtitle="incidents per cycle" icon={AlertTriangle}>
          <BarSeries data={series.slice(-12)} x="x" y="queue" color="#ff5d7a" height={200} />
        </Section>
        <Section title="Vehicle Mix" subtitle="live composition" icon={Car}>
          <PieBundle data={typeMix.filter(d => d.value > 0)} height={200} />
        </Section>
        <Section title="City Vital Signs" subtitle="composite radar" icon={Activity}>
          <RadarBundle data={radar} height={220} />
        </Section>
      </div>

      {/* UCP + agent strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section
          title="Urban Consensus Decision"
          subtitle="Observe → Analyze → Share → Negotiate → Consensus → Shadow → Approve → Execute"
          icon={Crosshair}
          className="lg:col-span-2"
        >
          {ucpDecision ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="pill-cyan">{ucpDecision.proposal}</span>
                <span className="text-[12px] text-slate-300">
                  Intersection <span className="text-neon-cyan">{ucpDecision.intersection_id}</span> ·
                  Direction <span className="text-neon-violet">{ucpDecision.direction}</span> ·
                  Extension <span className="text-neon-emerald">+{ucpDecision.extension_seconds}s</span>
                </span>
                <span className="pill-violet ml-auto">{(ucpDecision.confidence * 100).toFixed(0)}% confidence</span>
              </div>
              <p className="text-[12px] text-slate-300">{ucpDecision.reasoning}</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(ucpDecision.votes || {}).map(([k, v]) => (
                  <span key={k} className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/[0.03]">
                    <span className="text-slate-400">{k}</span>: <span className="text-neon-cyan">{v}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-slate-400">No active UCP decision — system is in monitoring mode.</p>
          )}
        </Section>

        <Section title="Active Alerts" subtitle={`${alerts.length} total`} icon={AlertTriangle}>
          <div className="space-y-2 max-h-56 overflow-auto pr-1">
            {(alerts || []).slice(0, 12).map((a) => {
              const sev = (a.severity || "low").toLowerCase();
              const color = sev === "critical" ? "border-neon-rose/40" : sev === "high" ? "border-neon-amber/40" : sev === "medium" ? "border-neon-cyan/40" : "border-white/10";
              return (
                <div key={a.id} className={`glass-soft px-3 py-2 border ${color}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium">{a.type}</span>
                    <span className={`pill ${sev === "critical" ? "pill-rose" : sev === "high" ? "pill-amber" : sev === "medium" ? "pill-cyan" : ""}`}>{sev}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">t={a.ts} · {a.id}</div>
                </div>
              );
            })}
            {!alerts?.length && <div className="text-[12px] text-slate-400">No alerts at this time.</div>}
          </div>
        </Section>
      </div>
    </div>
  );
}
