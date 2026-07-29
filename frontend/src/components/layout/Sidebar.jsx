import React from "react";
import { NavLink } from "react-router-dom";
import {
  Activity, Cpu, Map, Boxes, Users, Network, TrendingUp, BarChart3,
  GitBranch, History, AlertTriangle, FileText, Settings, Sparkles, Brain,
} from "lucide-react";
import clsx from "clsx";

const navGroups = [
  {
    label: "Operations",
    items: [
      { to: "/dashboard", label: "Live Dashboard", icon: Activity },
      { to: "/simulation", label: "Live Simulation", icon: Cpu },
      { to: "/twin", label: "3D Digital Twin", icon: Boxes },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/agents", label: "AI Agents", icon: Users },
      { to: "/agents/flow", label: "Agent Communication", icon: Network },
      { to: "/prediction", label: "Prediction", icon: TrendingUp },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { to: "/algorithms", label: "Algorithms", icon: GitBranch },
      { to: "/history", label: "Traffic History", icon: History },
      { to: "/alerts", label: "Alerts", icon: AlertTriangle },
      { to: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ connected, scenario }) {
  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col h-screen sticky top-0 glass border-r border-white/5 z-20">
      {/* Logo */}
      <div className="px-5 pt-5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center shadow-[0_0_20px_rgba(34,224,255,0.35)]">
            <Brain className="h-5 w-5 text-ink-900" />
          </div>
          <div>
            <div className="font-semibold tracking-wide text-[15px] grad-text">METRO-FLOW AI</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Urban Intelligence OS</div>
          </div>
        </div>
      </div>

      {/* Status pill */}
      <div className="px-5 pt-3 pb-2 flex items-center gap-2">
        <span className={clsx("h-2 w-2 rounded-full", connected ? "bg-neon-emerald animate-pulse_soft" : "bg-neon-rose")} />
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
          {connected ? "Live Stream" : "Offline"}
        </span>
        <span className="pill-cyan ml-auto">{scenario || "—"}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {navGroups.map((g) => (
          <div key={g.label}>
            <div className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {g.label}
            </div>
            <div className="space-y-1">
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === "/dashboard"}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition",
                      isActive
                        ? "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(34,224,255,0.35)]"
                        : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                    )
                  }
                >
                  <it.icon className="h-4 w-4 opacity-80" />
                  <span>{it.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-neon-cyan" />
          <div className="text-[11px] text-slate-400">
            <div>20 AI agents · UCP enabled</div>
            <div className="text-[10px] text-slate-500 mt-0.5">UrbanVerse v1.0</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
