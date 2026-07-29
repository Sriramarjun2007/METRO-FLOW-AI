import React, { useEffect, useState } from "react";
import Section from "../components/ui/Section.jsx";
import { GitBranch, Sigma, Workflow as WorkflowIcon, ChevronDown, ChevronRight, ShieldAlert } from "lucide-react";
import clsx from "clsx";

const FALLBACK = [
  { id: "yolov8", name: "YOLOv8 Detection", category: "Perception" },
  { id: "opencv", name: "OpenCV Preprocessing", category: "Perception" },
  { id: "ucp", name: "Urban Consensus Protocol", category: "Multi-Agent" },
  { id: "dpa", name: "Dynamic Priority Aging", category: "Scheduling" },
  { id: "deadlock", name: "Deadlock Detection", category: "Safety" },
  { id: "gridlock", name: "Gridlock Prevention", category: "Safety" },
  { id: "neighbor", name: "Neighbor Coordination", category: "Coordination" },
  { id: "density", name: "Traffic Density Estimation", category: "Perception" },
  { id: "trust", name: "Sensor Trust Score", category: "Perception" },
  { id: "queue", name: "Queue Optimization", category: "Scheduling" },
  { id: "twin", name: "Digital Twin Diff", category: "Multi-Agent" },
  { id: "dijkstra", name: "Dijkstra Pathfinding", category: "Routing" },
  { id: "astar", name: "A* Search", category: "Routing" },
  { id: "timeseries", name: "Time-Series Prediction", category: "Forecasting" },
  { id: "collision", name: "Collision Detection", category: "Safety" },
];

export default function AlgorithmsPage() {
  const [list, setList] = useState(FALLBACK);
  const [open, setOpen] = useState("ucp");
  const [detailMap, setDetailMap] = useState({});
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetch("/api/algorithms").then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length) {
        // expand fallback with details
        const map = {};
        data.forEach((d) => { map[d.id] = d; });
        setDetailMap(map);
        setList(data.map(({ id, name, category }) => ({ id, name, category })));
        setOpen(data[2]?.id || "ucp");
      }
    }).catch(() => {});
  }, []);

  const categories = ["All", ...Array.from(new Set(list.map((l) => l.category)))];
  const filtered = filter === "All" ? list : list.filter((l) => l.category === filter);
  const detail = detailMap[open] || {};

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold">Algorithms Engine</h1>
          <p className="text-[12px] text-slate-400">15 algorithms · visual explanations · math · workflow · trade-offs</p>
        </div>
        <div className="flex items-center gap-1.5">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={clsx("text-[11px] px-3 py-1.5 rounded-lg border",
                filter === c ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                              : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20")}>
              {c}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass p-3 lg:col-span-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 px-2 py-1">Catalog</div>
          <ul className="space-y-1 max-h-[640px] overflow-auto pr-1">
            {filtered.map((a) => (
              <li key={a.id}>
                <button onClick={() => setOpen(a.id)} className={clsx(
                  "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition",
                  open === a.id ? "bg-neon-cyan/10 border border-neon-cyan/30" : "hover:bg-white/[0.04]"
                )}>
                  {open === a.id ? <ChevronDown className="h-3 w-3 text-neon-cyan" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
                  <span className="text-[13px]">{a.name}</span>
                  <span className="ml-auto pill-cyan text-[9px]">{a.category}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Section title={detail.name || "Algorithm"} subtitle={detail.category || ""} icon={GitBranch}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Tile label="Purpose" body={detail.purpose} icon={WorkflowIcon} hue="cyan" />
              <Tile label="Why we use it" body={detail.why} icon={ShieldAlert} hue="violet" />
            </div>

            <div className="mt-4 glass-soft p-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                <Sigma className="h-3 w-3 text-neon-violet" /> Mathematical Idea
              </div>
              <pre className="mt-2 text-[12px] text-slate-200 whitespace-pre-wrap font-mono">{detail.math}</pre>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Tile label="Workflow" body={detail.flow} icon={WorkflowIcon} hue="emerald" />
              <Tile label="Advantages" body={detail.advantages} hue="emerald" />
              <Tile label="Limitations" body={detail.limitations} hue="rose" />
            </div>
          </Section>

          <div className="glass p-4 text-[11px] text-slate-400">
            All algorithms here run live in the backend Python stack and drive
            the 20 agent decisions. Read the math, observe the workflow, and
            inspect the verdict on the Live Dashboard.
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, body, icon: Icon, hue = "cyan" }) {
  const tone = {
    cyan: "text-neon-cyan border-neon-cyan/30",
    violet: "text-neon-violet border-neon-violet/30",
    emerald: "text-neon-emerald border-neon-emerald/30",
    rose: "text-neon-rose border-neon-rose/30",
  }[hue];
  return (
    <div className={`glass-soft p-3 border ${tone}`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em]">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="mt-1.5 text-[12px] text-white">{body}</div>
    </div>
  );
}
