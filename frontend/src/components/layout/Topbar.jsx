import React, { useState } from "react";
import { Bell, ChevronDown, Search, Wifi } from "lucide-react";
import clsx from "clsx";

const sdgList = [
  { id: 3, label: "Good Health", color: "#4c9f38" },
  { id: 7, label: "Clean Energy", color: "#fcc30b" },
  { id: 8, label: "Decent Work", color: "#a4144b" },
  { id: 9, label: "Industry/Innov.", color: "#f26247" },
  { id: 11, label: "Sustainable Cities", color: "#fdb713" },
  { id: 12, label: "Responsible Consumption", color: "#bf8d2c" },
  { id: 13, label: "Climate Action", color: "#3f7e44" },
  { id: 17, label: "Partnerships", color: "#19486a" },
];

export default function Topbar({ connected, scenario, onScenario, scenarios, cityHealth }) {
  const [open, setOpen] = useState(false);
  const score = Math.round(cityHealth || 0);
  const scoreColor = score >= 70 ? "text-neon-emerald" : score >= 40 ? "text-neon-amber" : "text-neon-rose";

  return (
    <header className="sticky top-0 z-10 backdrop-blur-xl bg-ink-900/70 border-b border-white/5">
      <div className="px-6 py-3 flex items-center gap-4">
        {/* Brand tag (mobile) */}
        <div className="md:hidden font-semibold grad-text">METRO-FLOW AI</div>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 w-72">
          <Search className="h-3.5 w-3.5 opacity-60" />
          <input
            placeholder="Search junctions, agents, vehicles..."
            className="bg-transparent text-[12px] outline-none placeholder:text-slate-500 flex-1"
          />
          <span className="kbd">⌘K</span>
        </div>

        <div className="flex-1" />

        {/* Scenario dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-neon-cyan/40 transition"
          >
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Scenario</span>
            <span className="text-[13px]">{(scenario || "normal").replace(/_/g, " ")}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
          {open && (
            <div
              className="absolute right-0 mt-2 w-80 glass-strong p-2 z-30"
              onMouseLeave={() => setOpen(false)}
            >
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  className={clsx(
                    "w-full text-left px-3 py-2 rounded-lg text-[12px] hover:bg-white/[0.06] flex items-center justify-between",
                    scenario === s.id && "bg-white/[0.06]"
                  )}
                  onClick={() => { onScenario(s.id); setOpen(false); }}
                >
                  <span>{s.label}</span>
                  <span className="pill-cyan">{s.config?.spawn_per_tick}/tick</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SDG tag rail */}
        <div className="hidden lg:flex items-center gap-1.5">
          {sdgList.map((s) => (
            <span
              key={s.id}
              title={s.label}
              style={{ borderColor: `${s.color}55`, color: s.color }}
              className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border bg-white/[0.02]"
            >
              SDG {s.id}
            </span>
          ))}
        </div>

        {/* City health gauge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10">
          <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Health</span>
          <span className={clsx("font-mono font-semibold text-[14px] tabular-nums", scoreColor)}>{score}</span>
        </div>

        {/* Stream icon */}
        <div className="hidden md:flex items-center gap-2 text-[11px]">
          <Wifi className={clsx("h-4 w-4", connected ? "text-neon-emerald" : "text-slate-500")} />
          <span className="text-slate-400">{connected ? "WS" : "—"}</span>
        </div>

        {/* Alerts */}
        <button className="px-2 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-neon-rose/40 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-neon-rose/90 text-[9px] flex items-center justify-center">
            !
          </span>
        </button>
      </div>
    </header>
  );
}
