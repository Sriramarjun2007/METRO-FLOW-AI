import React, { useEffect, useMemo, useState } from "react";
import Section from "../components/ui/Section.jsx";
import { Cpu, Pause, Play, RefreshCw } from "lucide-react";

const HUE_FOR_DIR = {
  north: "#22e0ff",
  south: "#8b5cf6",
  east: "#22d3a5",
  west: "#f5b942",
};

const COLOR_FOR_TYPE = {
  car: "#22e0ff",
  bike: "#60a5fa",
  bus: "#ff5d7a",
  truck: "#f59e0b",
  auto: "#22d3a5",
  ambulance: "#ff4b4b",
  fire_truck: "#fb923c",
  police: "#3b82f6",
  vip_convoy: "#a78bfa",
  pedestrian: "#94a3b8",
  cyclist: "#facc15",
};

// Map the simulator's coordinate system into a 2D canvas: lanes are 0..250m
// from a per-intersection origin. We render lanes as 250px-long bars.
export default function SimulationPage({ last }) {
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(null);
  const intersections = last?.intersections || {};
  const lanes = last?.lanes || {};

  // Build the rail network
  const network = useMemo(() => {
    const grid = {};
    Object.keys(intersections).forEach((id) => {
      grid[id] = intersections[id];
    });
    return grid;
  }, [intersections]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold">Live Simulation</h1>
          <p className="text-[12px] text-slate-400">3×3 intersection grid · 12 inbound lanes · physics-based</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill-cyan">scenario: {last?.scenario}</span>
          <button onClick={() => setPaused((p) => !p)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-neon-cyan/40 text-[12px] flex items-center gap-2">
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-neon-violet/40 text-[12px] flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Restart
          </button>
        </div>
      </header>

      <Section title="UrbanVerse Topology" subtitle="vehicles position · velocity · queue state · signal state" icon={Cpu}>
        <div className="relative">
          <svg viewBox="-50 -50 1100 1100" className="w-full h-[720px] rounded-xl bg-ink-800/40 border border-white/5">
            <defs>
              <linearGradient id="roadGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#1c264c" />
                <stop offset="100%" stopColor="#0a1024" />
              </linearGradient>
              <pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10">
                <path d="M0,10 L10,0" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Background grid */}
            {Array.from({ length: 4 }).map((_, i) => (
              <line key={`gx-${i}`} x1={i * 250} y1={0} x2={i * 250} y2={750} stroke="rgba(255,255,255,0.05)" />
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <line key={`gy-${i}`} x1={0} y1={i * 250} x2={750} y2={i * 250} stroke="rgba(255,255,255,0.05)" />
            ))}

            {/* Roads */}
            {[250, 500, 750].map((x) => (
              <rect key={`hx-${x}`} x={x - 14} y={0} width={28} height={750} fill="url(#roadGrad)" />
            ))}
            {[250, 500, 750].map((y) => (
              <rect key={`hy-${y}`} x={0} y={y - 14} width={750} height={28} fill="url(#roadGrad)" />
            ))}

            {/* Intersection boxes */}
            {Object.entries(network).map(([iid, inter]) => (
              <g key={iid} transform={`translate(${inter.x},${inter.y})`}>
                <rect x={-22} y={-22} width={44} height={44} fill="#121a36" stroke="rgba(255,255,255,0.18)" rx={4} />
                <text x={0} y={-26} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.7)" fontFamily="JetBrains Mono">
                  {iid}
                </text>
                {/* signal dots */}
                {Object.entries(inter.signals).map(([dir, s]) => {
                  const positions = {
                    north: [0, -16], south: [0, 16], east: [16, 0], west: [-16, 0],
                  };
                  const [x, y] = positions[dir] || [0, 0];
                  const color = s.color === "green" ? "#22d3a5" : s.color === "yellow" ? "#f5b942" : "#ff5d7a";
                  return (
                    <circle key={dir} cx={x} cy={y} r={3} fill={color} />
                  );
                })}
              </g>
            ))}

            {/* Vehicles */}
            {Object.entries(lanes).flatMap(([iid, dirMap]) =>
              Object.entries(dirMap).flatMap(([dir, lane]) =>
                (lane.vehicles || []).map((v, idx) => {
                  const i = intersections[iid];
                  const px = (() => {
                    // map direction to canvas coords
                    const off = v.position; // 0..245 m → px
                    switch (dir) {
                      case "north": return [i.x - 6, i.y - off];
                      case "south": return [i.x + 6, i.y + off];
                      case "east": return [i.x + off, i.y - 6];
                      case "west": return [i.x - off, i.y + 6];
                      default: return [i.x, i.y];
                    }
                  })();
                  const c = COLOR_FOR_TYPE[v.type] || "#ffffff";
                  const isEmergency = v.is_emergency;
                  return (
                    <g key={`${iid}-${dir}-${v.id}`} transform={`translate(${px[0]},${px[1]})`}
                       onMouseEnter={() => setHover({ v, iid, dir })} onMouseLeave={() => setHover(null)}>
                      <rect x={-4} y={-7} width={8} height={14} rx={2} fill={c}
                            opacity={v.queue_state === "queued" ? 0.7 : 1}>
                        {isEmergency && (
                          <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />
                        )}
                      </rect>
                      {!isEmergency && v.queue_state === "queued" && (
                        <circle cx={0} cy={0} r={2} fill={c} />
                      )}
                    </g>
                  );
                })
              )
            )}
          </svg>

          {/* Hover tooltip */}
          {hover && (
            <div className="absolute top-4 right-4 glass-strong p-3 w-64 z-10">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Vehicle</div>
              <div className="font-mono text-[12px] text-neon-cyan">{hover.v.id}</div>
              <div className="text-[11px] mt-1 text-slate-300">
                <div>Type: <span className="text-white">{hover.v.type}</span></div>
                <div>Speed: <span className="text-white">{hover.v.velocity?.toFixed(2)} m/s</span></div>
                <div>Position: <span className="text-white">{hover.v.position?.toFixed(1)} m</span></div>
                <div>Signal: <span className="text-white">{hover.v.signal_state}</span></div>
                <div>Queue: <span className="text-white">{hover.v.queue_state}</span></div>
                <div>Priority: <span className="text-white">{hover.v.base_priority}</span></div>
                <div>Wait: <span className="text-white">{hover.v.waiting_time?.toFixed(1)} s</span></div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 glass-soft px-3 py-2 flex flex-wrap gap-2">
            {Object.entries(COLOR_FOR_TYPE).slice(0, 8).map(([k, c]) => (
              <span key={k} className="text-[10px] flex items-center gap-1.5">
                <span style={{ background: c }} className="h-2 w-3 rounded-sm" />
                <span className="text-slate-300">{k}</span>
              </span>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
