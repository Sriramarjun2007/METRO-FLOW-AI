import React from "react";
import Section from "../components/ui/Section.jsx";
import { Settings as SettingsIcon, MapPin, Sliders } from "lucide-react";
import clsx from "clsx";

export default function SettingsPage({ scenario, onScenario, scenarios }) {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold">Settings</h1>
        <p className="text-[12px] text-slate-400">Scenario overrides · simulator seed · agent orchestration knobs</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Scenario" subtitle="Pick a synthetic scenario — every dashboard value reflects this choice" icon={MapPin}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(scenarios || []).map((s) => (
              <button key={s.id} onClick={() => onScenario(s.id)}
                className={clsx("text-left rounded-xl border p-3 transition",
                  scenario === s.id
                    ? "border-neon-cyan/40 bg-neon-cyan/10"
                    : "border-white/10 bg-white/[0.04] hover:border-white/20")}>
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-semibold">{s.label}</div>
                  <span className="pill-cyan">{s.config?.spawn_per_tick}/tick</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">id: {s.id}</div>
                {s.config?.block_road && (
                  <div className="mt-2 text-[10px] text-neon-rose">Road blocked: {s.config.block_road[1]} ({s.config.block_road[0]})</div>
                )}
                {s.config?.rain && <div className="text-[10px] text-neon-cyan">Weather: rain</div>}
                {s.config?.fog && <div className="text-[10px] text-slate-300">Weather: fog</div>}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Display & Effects" subtitle="cosmetic toggles" icon={Sliders}>
          <div className="space-y-2 text-[12px]">
            <ToggleRow label="Animated background" hint="flowing gradient mesh" defaultChecked />
            <ToggleRow label="Glassmorphism cards" hint="glass-strong fidelity" defaultChecked />
            <ToggleRow label="Sound on UCP approve" hint="subtle chime" />
            <ToggleRow label="Always show afternoons" hint="keep dashboard pinned" defaultChecked />
          </div>
        </Section>

        <Section title="System Info" subtitle="build details" icon={SettingsIcon}>
          <ul className="text-[12px] space-y-2">
            <li><span className="text-slate-400">Platform</span> <span className="text-white ml-2">METRO-FLOW AI · Enterprise Urban Intelligence</span></li>
            <li><span className="text-slate-400">Agents</span> <span className="text-white ml-2">20 modular agents · UCP enabled</span></li>
            <li><span className="text-slate-400">Stack</span> <span className="text-white ml-2">React 18 · Vite · Three.js · React Flow · Recharts · FastAPI · asyncio</span></li>
            <li><span className="text-slate-400">SDGs</span> <span className="text-white ml-2">3, 7, 8, 9, 11, 12, 13, 17</span></li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, defaultChecked }) {
  const [on, setOn] = React.useState(!!defaultChecked);
  return (
    <button onClick={() => setOn(!on)} className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 hover:border-white/20">
      <span className="text-left">
        <span className="text-white">{label}</span>
        <span className="block text-[10px] text-slate-400">{hint}</span>
      </span>
      <span className={clsx("h-5 w-9 rounded-full border transition relative",
        on ? "bg-neon-cyan/30 border-neon-cyan/60" : "bg-white/5 border-white/10")}>
        <span className={clsx("absolute top-0.5 h-3.5 w-3.5 rounded-full transition",
          on ? "left-4 bg-neon-cyan" : "left-0.5 bg-slate-400")} />
      </span>
    </button>
  );
}
