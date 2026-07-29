import React, { useState } from "react";
import Section from "../components/ui/Section.jsx";
import { FileText, Download, FileSpreadsheet, FileJson } from "lucide-react";

const REPORTS = [
  { id: "traffic", title: "Traffic Report",       desc: "Active vehicles, queue, congestion, occupancy, signal efficiency, travel time." },
  { id: "environment", title: "Environmental Report", desc: "CO₂ & fuel consumption; supports SDG 7/12/13 reporting and ESG filings." },
  { id: "agent", title: "Agent Report",        desc: "Per-agent decisions, confidence, status, health, last executed time." },
  { id: "signal", title: "Signal Report",       desc: "Per-intersection signal phase + density snapshot for every approach." },
  { id: "emergency", title: "Emergency Report",   desc: "Active emergency vehicles, positions, priority, corridor grants." },
  { id: "prediction", title: "Prediction Report",  desc: "5/10/30 minute forecasting horizon with confidence bands." },
];

export default function ReportsPage({ kpis, agents, last }) {
  const [downloading, setDownloading] = useState(null);

  function downloadAs(kind, fmt) {
    setDownloading(kind + fmt);
    const a = document.createElement("a");
    a.href = `/api/reports/${kind}${fmt === "json" ? "?fmt=json" : ""}`;
    a.download = `${kind}_report.${fmt}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => setDownloading(null), 1500);
  }

  // Generate a print-ready "PDF" view via inline HTML on this page (window.print fallback)
  function printView(kind) {
    const html = `
<!doctype html><html><head><title>${kind} report</title>
<style>
body { font-family: Inter, system-ui, sans-serif; background:#fff; color:#0b1220; padding: 32px; }
h1 { font-size: 22px; margin-bottom: 8px; }
.meta { color:#556; font-size: 12px; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
</style></head><body>
<h1>METRO-FLOW AI — ${kind.toUpperCase()} Report</h1>
<div class="meta">Tick: ${last?.tick ?? "—"} · Sim time: ${last?.sim_time ?? 0}s · Scenario: ${last?.scenario ?? "—"}</div>
<pre style="white-space:pre-wrap;font-size:11px;background:#f1f3f8;padding:12px;border-radius:8px;">${escape(JSON.stringify({ kpis, snapshot: last, agents }, null, 2))}</pre>
</body></html>`;
    const w = window.open("about:blank", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold">Reports</h1>
        <p className="text-[12px] text-slate-400">Downloadable Traffic, Environment, Agent, Signal, Emergency & Prediction reports in PDF / CSV / JSON.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <Section key={r.id} title={r.title} subtitle={r.desc} icon={FileText}>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button onClick={() => printView(r.id)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-neon-cyan/40 text-[11px] flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
              <button onClick={() => downloadAs(r.id, "csv")} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-neon-emerald/40 text-[11px] flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </button>
              <button onClick={() => downloadAs(r.id, "json")} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-neon-violet/40 text-[11px] flex items-center gap-1.5">
                <FileJson className="h-3.5 w-3.5" /> JSON
              </button>
              {downloading?.startsWith(r.id) && <span className="pill-emerald ml-auto text-[10px]">downloading...</span>}
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}

function escape(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
