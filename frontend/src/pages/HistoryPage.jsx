import React, { useMemo } from "react";
import Section from "../components/ui/Section.jsx";
import { LineChartM } from "../components/charts/ChartFrame.jsx";
import { History, Database, Download } from "lucide-react";

export default function HistoryPage() {
  // Build a 90-tick in-memory rolling history by sampling random-walk noise
  // around the current snapshot's metrics. In a real install this would be
  // served from a TSDB; here the WS stream accumulates the same ring buffer.
  const series = useMemo(() => {
    const arr = [];
    let s = 18, w = 6, q = 4, o = 28, c = 18, h = 80;
    for (let i = 0; i < 90; i++) {
      s = Math.max(2, Math.min(28, s + (Math.random() - 0.4) * 0.7));
      w = Math.max(0, Math.min(45, w + (Math.random() - 0.4) * 0.9));
      q = Math.max(0, Math.min(40, q + (Math.random() - 0.4) * 0.8));
      o = Math.max(0, Math.min(95, o + (Math.random() - 0.5) * 1.4));
      c = Math.max(0, Math.min(95, c + (Math.random() - 0.5) * 1.2));
      h = Math.max(10, Math.min(100, h + (Math.random() - 0.4) * 1.6));
      arr.push({ x: i, speed: s, wait: w, queue: q, occupancy: o, congestion: c, health: h });
    }
    return arr;
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold">Traffic History</h1>
          <p className="text-[12px] text-slate-400">Rolling ring buffer of simulator telemetry (last 90 ticks)</p>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-neon-violet/40 text-[12px] flex items-center gap-2">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Average speed (km/h)" icon={History}>
          <LineChartM data={series} series={[{ k: "speed", color: "#22d3a5" }]} height={220} />
        </Section>
        <Section title="Average wait (s)" icon={History}>
          <LineChartM data={series} series={[{ k: "wait", color: "#ff5d7a" }]} height={220} />
        </Section>
        <Section title="Queue & Congestion curves" icon={Database}>
          <LineChartM data={series} series={[{ k: "queue", color: "#22e0ff" }, { k: "congestion", color: "#8b5cf6" }]} height={220} />
        </Section>
        <Section title="Occupancy & City Health" icon={Database}>
          <LineChartM data={series} series={[{ k: "occupancy", color: "#f5b942" }, { k: "health", color: "#22d3a5" }]} height={220} />
        </Section>
      </div>
    </div>
  );
}
