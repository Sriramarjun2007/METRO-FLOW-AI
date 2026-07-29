import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background, Controls, MiniMap, Handle, Position,
} from "reactflow";
import "reactflow/dist/style.css";
import Section from "../components/ui/Section.jsx";
import { Network } from "lucide-react";

// Default topology — agents cluster around the UCP backbone.
const PIPELINE = [
  { id: "vision", label: "Vision", agent: "Vision Agent", x: 0, y: 1 },
  { id: "trafficState", label: "Traffic State", agent: "Traffic State Agent", x: 1, y: 1 },
  { id: "sensorTrust", label: "Sensor Trust", agent: "Sensor Trust Agent", x: 0, y: 0 },
  { id: "weather", label: "Weather", agent: "Weather Agent", x: 0, y: 2 },
  { id: "event", label: "Event Mgmt", agent: "Event Management Agent", x: 1, y: 0 },
  { id: "emergency", label: "Emergency", agent: "Emergency Response Agent", x: 1, y: 2 },
  { id: "publicTransport", label: "Public Transport", agent: "Public Transport Agent", x: 2, y: 0 },
  { id: "neighbor", label: "Neighbor Coord.", agent: "Neighbor Coordination Agent", x: 2, y: 1 },
  { id: "route", label: "Route Opt.", agent: "Route Optimization Agent", x: 2, y: 2 },
  { id: "safety", label: "Safety Guard", agent: "Safety Guard Agent", x: 3, y: 0 },
  { id: "ucp", label: "UCP", agent: "Urban Consensus Agent", x: 4, y: 1 },
  { id: "shadow", label: "Shadow City", agent: "Shadow City Agent", x: 4, y: 0 },
  { id: "controller", label: "Controller", agent: "Intersection Controller Agent", x: 5, y: 1 },
  { id: "prediction", label: "Prediction", agent: "Prediction Agent", x: 5, y: 0 },
  { id: "sustainability", label: "Sustain.", agent: "Sustainability Agent", x: 5, y: 2 },
  { id: "analytics", label: "Analytics", agent: "Analytics Agent", x: 6, y: 0 },
  { id: "xai", label: "XAI", agent: "Explainable AI Agent", x: 6, y: 1 },
  { id: "alert", label: "Alert", agent: "Alert Agent", x: 6, y: 2 },
  { id: "dashboard", label: "Dashboard", agent: "Dashboard Agent", x: 7, y: 1 },
  { id: "urbanverse", label: "UrbanVerse AI", agent: "UrbanVerse AI", x: 4, y: 2 },
];

const EDGES = [
  ["vision", "trafficState"],
  ["sensorTrust", "trafficState"],
  ["weather", "trafficState"],
  ["trafficState", "ucp"],
  ["trafficState", "prediction"],
  ["event", "ucp"],
  ["emergency", "ucp"],
  ["publicTransport", "ucp"],
  ["neighbor", "ucp"],
  ["route", "ucp"],
  ["safety", "ucp"],
  ["ucp", "shadow"],
  ["shadow", "ucp"],
  ["ucp", "controller"],
  ["prediction", "dashboard"],
  ["sustainability", "dashboard"],
  ["analytics", "dashboard"],
  ["xai", "dashboard"],
  ["alert", "dashboard"],
  ["urbanverse", "dashboard"],
  ["emergency", "controller"],
  ["neighbor", "controller"],
];

function AgentNode({ data }) {
  return (
    <div className="glass-strong px-3 py-2 rounded-xl w-[150px] hover:border-neon-cyan/50 transition" style={{ borderColor: data.last?.status === "error" ? "#ff5d7a" : undefined }}>
      <Handle type="target" position={Position.Left} />
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 truncate">{data.agent}</div>
      <div className="text-[12px] font-semibold mt-0.5 truncate">{data.label}</div>
      {data.last && (
        <div className="mt-1 flex items-center gap-1.5 text-[9px]">
          <span className={`pill ${data.last.health === "degraded" ? "pill-rose" : "pill-emerald"}`}>{data.last.health}</span>
          <span className="font-mono text-neon-cyan">{(data.last.confidence * 100).toFixed(0)}%</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

export default function FlowPage({ agents }) {
  const [selected, setSelected] = useState(null);

  const agentMap = useMemo(() => Object.fromEntries((agents || []).map((a) => [a.agent_name, a])), [agents]);

  const nodes = useMemo(() => PIPELINE.map((p) => {
    const last = agentMap[p.agent];
    return {
      id: p.id,
      type: "agent",
      position: { x: p.x * 200 + 40, y: p.y * 120 + 80 },
      data: { ...p, last },
    };
  }), [agentMap]);

  const edges = useMemo(() => EDGES.map(([s, t], i) => ({
    id: `e-${i}`,
    source: s,
    target: t,
    animated: true,
    style: { stroke: "rgba(34,224,255,0.6)", strokeWidth: 1.4 },
  })), []);

  const onNodeClick = useCallback((_, n) => {
    setSelected({ id: n.id, ...n.data });
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold">Agent Communication Graph</h1>
          <p className="text-[12px] text-slate-400">20 agents · live throughput · click an agent to inspect</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Section title="MAS Topology" subtitle="Observe → Analyze → Share → Negotiate → Consensus → Shadow → Approve → Execute" icon={Network} className="lg:col-span-3 p-0 overflow-hidden">
          <div className="h-[640px] relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              defaultEdgeOptions={{ animated: true }}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="rgba(255,255,255,0.06)" gap={20} size={1.2} />
              <Controls position="bottom-right" />
              <MiniMap nodeStrokeColor="rgba(255,255,255,0.4)" nodeColor="#1c264c" maskColor="rgba(5,7,20,0.7)" />
            </ReactFlow>
          </div>
        </Section>

        <Section title="Selected Agent" subtitle="Click any node to view its live trace" icon={Network}>
          {selected ? (
            <div className="space-y-3">
              <div>
                <div className="text-[12px] text-slate-400">Agent</div>
                <div className="font-semibold">{selected.agent}</div>
                <div className="text-[11px] text-neon-cyan">{selected.label}</div>
              </div>
              {selected.last ? (
                <>
                  <KV label="Decision" value={selected.last.decision} />
                  <KV label="Reason" value={selected.last.reason} />
                  <KV label="Algorithm" value={selected.last.algorithm} />
                  <KV label="Confidence" value={`${(selected.last.confidence * 100).toFixed(1)}%`} />
                  <KV label="Input" value={<code className="text-[10px] break-all text-slate-200">{JSON.stringify(selected.last.input)}</code>} />
                  <KV label="Output" value={<code className="text-[10px] break-all text-slate-200 max-h-32 overflow-auto block">{JSON.stringify(selected.last.output)}</code>} />
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Communication</div>
                    <ul className="space-y-1">
                      {(selected.last.communication_log || []).map((m, i) => (
                        <li key={i} className="text-[11px] flex items-center gap-1.5">
                          <span className="text-neon-cyan">{m.topic}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-slate-300 truncate">{(m.subscribers || m.consumers || []).join(", ") || JSON.stringify({ ...m, topic: undefined, sender: undefined, ts: undefined })}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-slate-400">No data yet — agent idle for this tick.</div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">No selection.</div>
          )}
        </Section>
      </div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-[12px] text-white mt-0.5 break-words">{value}</div>
    </div>
  );
}
