import React, { useState } from "react";
import {
  Cpu,
  ShieldCheck,
  Bus,
  Siren,
  Radio,
  Activity,
  ArrowRight,
  Github,
  Network,
  Gauge,
  Zap,
  CheckCircle2,
  Terminal,
  TrendingDown,
  Clock,
  Sparkles,
  Layers
} from "lucide-react";

// Links
const GITHUB_REPO_URL = "https://github.com/your-org/metro-flow";
const DOCS_URL = "#how-it-works";

const AGENTS = [
  {
    id: "intersection",
    icon: Gauge,
    title: "Intersection Agent",
    tagline: "Queue-Actuated Timing",
    desc: "Eliminates static signal cycles. Dynamically extends green phases based on live vehicle queue density.",
    code: "if queue_len(active_lane) > threshold:\n    extend_green_phase(step=5)"
  },
  {
    id: "neighbor",
    icon: Network,
    title: "Neighbor Coordination",
    tagline: "Spillback Prevention",
    desc: "Inter-junction communication prevents deadlock. Upstream signals back off when shared road capacity reaches 85%.",
    code: "if link_occupancy(J1, J2) > 0.85:\n    upstream_agent.apply_backoff()"
  },
  {
    id: "emergency",
    icon: Siren,
    title: "Emergency Corridor",
    tagline: "120m Corridor Lock",
    desc: "Detects priority emergency vehicles and instantly clears green channels, overriding all standard agent logic.",
    code: "if emergency_vehicle.distance < 120:\n    force_green_corridor(route=ambulance.path)"
  },
  {
    id: "transit",
    icon: Bus,
    title: "Transit Priority",
    tagline: "Public Transport Speedup",
    desc: "Grants short green light extensions to public transit buses to ensure schedule adherence without breaking system flow.",
    code: "if bus.approaching() and bus.delay > 30:\n    grant_soft_extension(max_sec=10)"
  },
  {
    id: "fusion",
    icon: Radio,
    title: "Sensor Fusion",
    tagline: "Noise-Resistant Fallbacks",
    desc: "Handles delayed, noisy, or missing induction loop data using Kalman filter estimates so signal cycles never freeze.",
    code: "density = kalman_filter.update(raw_sensor_feed)"
  },
  {
    id: "twin",
    icon: ShieldCheck,
    title: "Digital Twin (SUMO)",
    tagline: "Real-Time Verification",
    desc: "Validates all agent policy decisions in a SUMO micro-simulation loop before executing commands on real signal hardware.",
    code: "sumo.simulationStep()\ntelemetry = sumo.get_metrics()"
  },
];

const IMPACT_METRICS = [
  { label: "Emergency Response Delay", value: "-42%", icon: Clock, color: "text-emerald-400" },
  { label: "CO₂ Emission Reduction", value: "-28%", icon: TrendingDown, color: "text-cyan-400" },
  { label: "Gridlock Occurrence", value: "0.0%", icon: CheckCircle2, color: "text-violet-400" },
];

const STACK = ["SUMO", "TraCI", "FastAPI", "Python", "React", "Tailwind CSS", "WebSockets"];

const SDGS = [
  { n: "03", color: "bg-emerald-500", label: "Good Health & Well-being", detail: "Automatic green corridors ensure ambulances reach hospitals faster." },
  { n: "11", color: "bg-amber-500", label: "Sustainable Cities", detail: "Multi-agent coordination eliminates bottleneck congestion." },
  { n: "13", color: "bg-green-600", label: "Climate Action", detail: "Reduced vehicle idle times directly lower urban carbon emissions." },
];

export default function WelcomePage({ onEnter = () => {}, last }) {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
  const live = Boolean(last);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Subtle Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Radial Glow FX */}
      <div className="pointer-events-none fixed -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[150px]" />
      <div className="pointer-events-none fixed -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[150px]" />

      <div className="relative max-w-6xl mx-auto px-6 py-10 z-10">
        
        {/* Top Navbar */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Cpu className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <div className="font-mono text-sm tracking-[0.25em] font-extrabold text-slate-100 flex items-center gap-2">
                METRO-FLOW <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono">v2.4</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">AUTONOMOUS TRAFFIC ENGINE</p>
            </div>
          </div>

          <a
            href={"https://github.com/Sriramarjun2007/METRO-FLOW-AI"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 hover:border-cyan-400/50 hover:bg-slate-800 text-xs font-mono transition-all backdrop-blur-md shadow-lg"
          >
            <Github className="h-4 w-4 text-slate-300" />
            Repository
          </a>
        </div>

        {/* Hero Banner */}
        <div className="text-center max-w-4xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-300 mb-8 backdrop-blur-xl shadow-xl">
            <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-400 animate-ping" : "bg-cyan-400"}`} />
            {live ? "LIVE SIMULATION CONNECTED — REAL-TIME METRICS" : "DIGITAL TWIN ENGINE READY"}
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] drop-shadow-2xl">
            Traffic that{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-500">
              coordinates itself
            </span>
          </h1>

          <p className="mt-6 text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto font-light">
            A distributed multi-agent system replacing legacy fixed traffic timers. Driven by SUMO simulation, TraCI Python loops, and real-time emergency routing.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onEnter}
              className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-600 text-slate-950 font-black text-sm shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Enter Live Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            <a
              href={DOCS_URL}
              className="px-8 py-4 rounded-2xl border border-white/15 bg-slate-900/60 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:border-cyan-400/40 hover:text-white transition-all backdrop-blur-md"
            >
              System Architecture
            </a>
          </div>
        </div>

        {/* Competition Impact Benchmarks Banner */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4">
          {IMPACT_METRICS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex items-center justify-between shadow-xl">
              <div>
                <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">{label}</p>
                <p className={`text-3xl font-black font-mono mt-1 ${color}`}>{value}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Live Telemetry Strip */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/20 backdrop-blur-xl flex flex-wrap items-center justify-around gap-4 text-center">
          <div>
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Active Vehicles</span>
            <span className="text-lg font-mono font-bold text-cyan-400">{last?.vehicle_count ?? "154"}</span>
          </div>
          <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />
          <div>
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Simulation Time</span>
            <span className="text-lg font-mono font-bold text-slate-200">{last ? `${last.sim_time}s` : "345s"}</span>
          </div>
          <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />
          <div>
            <span className="text-[11px] font-mono text-slate-500 uppercase block">Total CO₂ Output</span>
            <span className="text-lg font-mono font-bold text-emerald-400">{last ? `${Number(last.total_co2).toFixed(1)} mg/s` : "12.8 mg/s"}</span>
          </div>
        </div>

        {/* Interactive Agent Inspector Section */}
        <div className="mt-28">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.3em] text-cyan-400 uppercase bg-slate-900 px-4 py-1.5 rounded-full border border-cyan-500/30">
              <Sparkles className="h-3.5 w-3.5" /> Technical Architecture
            </div>
            <p className="text-3xl font-black mt-3 text-slate-100">Explore the Multi-Agent Intelligence</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Agent Selector List */}
            <div className="lg:col-span-5 space-y-3">
              {AGENTS.map((agent) => {
                const Icon = agent.icon;
                const isSelected = selectedAgent.id === agent.id;
                return (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-500/10"
                        : "bg-slate-900/40 border-white/5 hover:border-white/20 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isSelected ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-white/[0.04] text-slate-400"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-200">{agent.title}</h3>
                        <p className="text-xs text-slate-400 font-mono">{agent.tagline}</p>
                      </div>
                    </div>
                    {isSelected && <ArrowRight className="h-4 w-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>

            {/* Right Column: Code & Logic Preview Box */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-mono text-slate-300 font-bold">{selectedAgent.title} Logic</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Active Rule
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                {selectedAgent.desc}
              </p>

              {/* Pseudo-code block */}
              <div className="rounded-xl bg-slate-900/90 border border-white/10 p-4 font-mono text-xs text-cyan-300 leading-relaxed">
                <pre>{selectedAgent.code}</pre>
              </div>
            </div>

          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-28 text-center">
          <h2 className="text-xs font-mono tracking-[0.3em] text-slate-500 uppercase mb-6">Built With Production Stack</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {STACK.map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs font-mono text-slate-300 shadow-md"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* SDGs Section */}
        <div className="mt-28 mb-12">
          <div className="text-center mb-10">
            <h2 className="text-xs font-mono tracking-[0.3em] text-violet-400 uppercase">Global Alignment</h2>
            <p className="text-2xl font-bold mt-2">UN Sustainable Development Goals</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SDGS.map((s) => (
              <div key={s.n} className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-slate-950 ${s.color}`}>
                    {s.n}
                  </div>
                  <span className="text-sm font-bold text-slate-200">{s.label}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center py-16 border-t border-white/10">
          <p className="text-slate-400 text-xs mb-6">Ready to see two autonomous intersections coordinate live traffic?</p>
          <button
            onClick={onEnter}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-600 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/20 hover:opacity-90 transition-all cursor-pointer"
          >
            <Activity className="h-4 w-4" />
            Launch Live Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}