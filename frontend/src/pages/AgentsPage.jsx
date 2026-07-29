import React, { useState } from "react";
import { Users, ChevronRight, Cpu, BookOpen, ArrowRight, Network } from "lucide-react";
import Section from "../components/ui/Section.jsx";
import clsx from "clsx";

const SDGS = {
  3: { label: "Good Health", color: "#4c9f38" },
  7: { label: "Clean Energy", color: "#fcc30b" },
  8: { label: "Decent Work", color: "#a4144b" },
  9: { label: "Industry/Innovation", color: "#f26247" },
  11: { label: "Sustainable Cities", color: "#fdb713" },
  12: { label: "Consumption", color: "#bf8d2c" },
  13: { label: "Climate Action", color: "#3f7e44" },
  17: { label: "Partnerships", color: "#19486a" },
};

export default function AgentsPage({ agents }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold">20 AI Agents</h1>
          <p className="text-[12px] text-slate-400">Each agent exposes Name, Purpose, Input, Algorithm, Processing Steps, Decision, Reason, Confidence, Execution Time, Communication Log, Output, Expected Impact, Status, Health.</p>
        </div>
        <a href="/agents/flow" className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-neon-cyan/40 text-[12px] flex items-center gap-2">
          <Network className="h-3.5 w-3.5" />
          Open Communication Graph
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(agents || []).map((a) => (
          <AgentCard key={a.agent_id} agent={a} expanded={open === a.agent_id} onToggle={() => setOpen(open === a.agent_id ? null : a.agent_id)} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ agent, expanded, onToggle }) {
  const statTone = {
    ok: "border-neon-emerald/40 bg-neon-emerald/10 text-neon-emerald",
    error: "border-neon-rose/40 bg-neon-rose/10 text-neon-rose",
    idle: "border-white/10 bg-white/[0.04] text-slate-300",
  }[agent.status] || "border-white/10 bg-white/[0.04] text-slate-300";
  const healthTone = agent.health === "degraded" ? "pill-rose" : "pill-emerald";

  return (
    <article className="glass overflow-hidden hover:border-white/20 transition">
      <header className="p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-cyan/30 to-neon-violet/30 flex items-center justify-center border border-white/10">
          <Cpu className="h-5 w-5 text-white/90" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold truncate">{agent.agent_name}</h3>
            <span className={clsx("pill", healthTone)}>{agent.health}</span>
          </div>
          <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">{agent.purpose}</div>
        </div>
      </header>
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className={clsx("pill", statTone)}>{agent.status}</span>
          <span className="pill-cyan">{agent.algorithm.split("+")[0].split("(")[0].trim()}</span>
          {(agent.sdg_tags || []).map((s) => (
            <span key={s} style={{ borderColor: `${SDGS[s]?.color}66`, color: SDGS[s]?.color }} className="pill">
              SDG {s}
            </span>
          ))}
        </div>
      </div>

      <div className="px-4 pb-3 flex items-center gap-3 text-[11px]">
        <div className="flex-1">
          <div className="text-slate-400">Decision</div>
          <div className="text-white truncate">{agent.decision}</div>
        </div>
        <div>
          <div className="text-slate-400">Conf.</div>
          <div className={clsx(
            agent.confidence > 0.7 ? "text-neon-emerald" :
            agent.confidence > 0.4 ? "text-neon-amber" : "text-neon-rose"
          )}>{(agent.confidence * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-slate-400">Exec</div>
          <div className="text-neon-cyan font-mono">{agent.execution_time_ms?.toFixed(1)}ms</div>
        </div>
      </div>

      <button onClick={onToggle} className="px-4 pb-4 text-[11px] flex items-center gap-1.5 text-slate-300 hover:text-neon-cyan">
        {expanded ? "Collapse details" : "Expand details"} <ArrowRight className={clsx("h-3 w-3 transition-transform", expanded && "rotate-90")} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3 text-[11px]">
          <FieldRow label="Agent ID" value={<span className="font-mono text-neon-cyan">{agent.agent_id}</span>} />
          <FieldRow label="Purpose" value={agent.purpose} />
          <FieldRow label="Algorithm" value={agent.algorithm} />
          <FieldRow label="Input" value={<code className="text-[10px] text-slate-300">{JSON.stringify(agent.input)}</code>} />
          <FieldRow label="Output" value={<code className="text-[10px] text-slate-300 max-h-32 overflow-auto block">{JSON.stringify(agent.output)}</code>} />
          <FieldRow label="Reason" value={<span className="text-slate-200">{agent.reason}</span>} />
          <FieldRow label="Expected Impact" value={agent.expected_impact} />
          <div>
            <div className="text-slate-400 mb-1">Processing Steps</div>
            <ol className="space-y-1 pl-4 list-decimal text-slate-200">
              {(agent.processing_steps || []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
          <div>
            <div className="text-slate-400 mb-1 flex items-center gap-1.5"><BookOpen className="h-3 w-3" /> Communication Log</div>
            <ul className="space-y-1">
              {(agent.communication_log || []).map((m, i) => (
                <li key={i} className="text-slate-200 flex items-center gap-2">
                  <span className="text-slate-500 font-mono">{i + 1}.</span>
                  <span className="text-neon-cyan">{m.topic}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-slate-300">{(m.subscribers || m.consumers || []).join(", ") || m.in || ""}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </article>
  );
}

function FieldRow({ label, value }) {
  return (
    <div>
      <div className="text-slate-400">{label}</div>
      <div className="text-white text-[12px] mt-0.5">{value}</div>
    </div>
  );
}
