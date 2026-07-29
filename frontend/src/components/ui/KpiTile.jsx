import React from "react";
import clsx from "clsx";

// A reusable gradient-bordered KPI tile used across the dashboard.
export default function KpiTile({ label, value, sub, icon: Icon, hue = "cyan", trend }) {
  const tone = {
    cyan: "from-neon-cyan/25 to-transparent text-neon-cyan",
    violet: "from-neon-violet/25 to-transparent text-neon-violet",
    emerald: "from-neon-emerald/25 to-transparent text-neon-emerald",
    rose: "from-neon-rose/25 to-transparent text-neon-rose",
    amber: "from-neon-amber/25 to-transparent text-neon-amber",
  }[hue];

  return (
    <div className="glass p-4 relative overflow-hidden group hover:border-white/20 transition">
      <div className={clsx("absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl bg-gradient-to-br", tone)} />
      <div className="flex items-center justify-between relative">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</span>
        {Icon && <Icon className={clsx("h-4 w-4", tone?.split(" ")[2])} />}
      </div>
      <div className="mt-2 text-[28px] font-semibold tabular-nums tracking-tight relative">{value}</div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 relative">
        {sub && <span>{sub}</span>}
        {trend && (
          <span className={clsx(
            trend.startsWith("+") ? "text-neon-emerald" :
            trend.startsWith("-") ? "text-neon-rose" : "text-slate-300"
          )}>{trend}</span>
        )}
      </div>
    </div>
  );
}
