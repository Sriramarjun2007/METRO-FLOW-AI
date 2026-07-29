import React from "react";
import Section from "../components/ui/Section.jsx";
import { AlertTriangle, Activity } from "lucide-react";
import clsx from "clsx";

const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
const severityColor = {
  critical: "border-neon-rose/40 bg-neon-rose/10",
  high: "border-neon-amber/40 bg-neon-amber/10",
  medium: "border-neon-cyan/40 bg-neon-cyan/10",
  low: "border-white/10 bg-white/[0.04]",
};

export default function AlertsPage({ alerts, last }) {
  const sorted = [...(alerts || [])].sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold">Live Alert Center</h1>
          <p className="text-[12px] text-slate-400">Triaged alerts · severity · location · recommended action · affected roads</p>
        </div>
        <span className="pill-rose">{sorted.length} active</span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Section title="Severity Mix" icon={Activity} className="lg:col-span-1">
          <div className="space-y-2 mt-1">
            {["critical", "high", "medium", "low"].map((s) => {
              const n = sorted.filter((a) => (a.severity || "low") === s).length;
              const total = Math.max(1, sorted.length);
              return (
                <div key={s} className="glass-soft p-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300 capitalize">{s}</span>
                    <span className="text-slate-400">{n}/{total}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <div className={clsx("h-full", s === "critical" ? "bg-neon-rose" : s === "high" ? "bg-neon-amber" : s === "medium" ? "bg-neon-cyan" : "bg-slate-400")} style={{ width: `${(n / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Active Alerts" subtitle={`scenario: ${last?.scenario || "—"}`} icon={AlertTriangle} className="lg:col-span-3">
          <div className="space-y-2 max-h-[640px] overflow-auto pr-1">
            {sorted.map((a) => {
              const sev = (a.severity || "low").toLowerCase();
              return (
                <div key={a.id} className={clsx("glass-soft p-3 border", severityColor[sev])}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[13px] font-semibold">{a.type}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{a.id}</div>
                    </div>
                    <span className={clsx("pill", sev === "critical" ? "pill-rose" : sev === "high" ? "pill-amber" : sev === "medium" ? "pill-cyan" : "")}>{sev}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-300 space-y-0.5">
                    {a.ts !== undefined && <div>Timestamp: <span className="text-white">t={a.ts?.toFixed?.(1) ?? a.ts}</span></div>}
                    {a.detail && Object.entries(a.detail).slice(0, 4).map(([k, v]) => (
                      <div key={k}>{k}: <span className="text-white">{JSON.stringify(v)}</span></div>
                    ))}
                    {a.location && <div>Location: <span className="text-white">{a.location}</span></div>}
                    {a.recommended_action && <div>Recommended action: <span className="text-white">{a.recommended_action}</span></div>}
                  </div>
                </div>
              );
            })}
            {!sorted.length && (
              <div className="text-[12px] text-slate-400">No active alerts. City is healthy.</div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
