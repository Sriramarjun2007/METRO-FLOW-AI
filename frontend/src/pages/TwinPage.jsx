import React, { useRef, useMemo, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Stars, Cloud } from "@react-three/drei";
import * as THREE from "three";
import Section from "../components/ui/Section.jsx";
import { Boxes, Sun, Moon, CloudRain } from "lucide-react";
import clsx from "clsx";

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

const SCALE = 0.6; // 1 lane meter → 0.6 scene units

function Building({ position, height, width, depth, hue = "#1c264c" }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={hue} metalness={0.35} roughness={0.6} emissive={"#0a1024"} emissiveIntensity={0.25} />
      {/* glow strip on rooflines */}
      <mesh position={[0, height / 2 + 0.05, 0]}>
        <boxGeometry args={[width + 0.04, 0.04, depth + 0.04]} />
        <meshBasicMaterial color={"#22e0ff"} toneMapped={false} opacity={0.6} transparent />
      </mesh>
    </mesh>
  );
}

function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 1, 6]} />
        <meshStandardMaterial color={"#3f2d1f"} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.7, 8, 8]} />
        <meshStandardMaterial color={"#1ec76b"} emissive={"#0ea35b"} emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

function Road({ orientation, position, length = 28 }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, orientation === "y" ? 0 : Math.PI / 2]}>
        <boxGeometry args={[length, 0.05, 1.4]} />
        <meshStandardMaterial color={"#0a1024"} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh rotation={[0, 0, orientation === "y" ? 0 : Math.PI / 2]} position={[0, 0.03, 0]}>
        <boxGeometry args={[length, 0.06, 0.05]} />
        <meshBasicMaterial color={"rgba(255,255,255,0.6)"} toneMapped={false} />
      </mesh>
    </group>
  );
}

function TrafficLight({ position, color }) {
  const c = color === "green" ? "#22d3a5" : color === "yellow" ? "#f5b942" : "#ff5d7a";
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
        <meshStandardMaterial color={"#10162e"} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial color={c} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Vehicle({ position, color, length, isEmergency }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.material.emissiveIntensity = isEmergency ? 2 + Math.sin(performance.now() / 200) : 0.4;
    }
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <boxGeometry args={[length, 0.25, 0.7]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isEmergency ? 2 : 0.4}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function Scene({ last, dusk }) {
  const intersections = last?.intersections || {};
  const lanes = last?.lanes || {};

  const scale = SCALE;
  const toFiniteNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const safeIntersections = useMemo(() => {
    return Object.entries(intersections).reduce((acc, [iid, value]) => {
      if (!value) return acc;
      const x = toFiniteNumber(value.x, 0);
      const y = toFiniteNumber(value.y, 0);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return acc;
      acc[iid] = { ...value, x, y };
      return acc;
    }, {});
  }, [intersections]);

  const interPos = useMemo(() => Object.fromEntries(
    Object.entries(safeIntersections).map(([iid, value]) => [iid, [value.x * scale, 0, value.y * scale]])
  ), [safeIntersections, scale]);

  // layout buildings per cell (between intersections)
  const buildingSeeds = useMemo(() => {
    const out = [];
    Object.values(interPos).forEach(([x, _y, z]) => {
      const safeX = toFiniteNumber(x, 0);
      const safeZ = toFiniteNumber(z, 0);
      out.push([safeX + 6, Math.max(3, Math.abs(safeZ) + 4), 4, 5]);
      out.push([safeX - 6, Math.max(3, Math.abs(safeZ) + 5), 3, 6]);
      out.push([safeX + 4, Math.max(3, Math.abs(safeZ) + 6), 5, 4]);
      out.push([safeX - 4, Math.max(3, Math.abs(safeZ) + 7), 3.5, 5]);
    });
    return out;
  }, [interPos]);

  return (
    <>
      {/* ambient + key lights */}
      <ambientLight intensity={dusk ? 0.25 : 0.6} color={dusk ? "#7080ff" : "#ffffff"} />
      <directionalLight position={[10, 14, 6]} intensity={dusk ? 0.6 : 1.1} color={dusk ? "#a8b1ff" : "#fff7e6"} />
      <pointLight position={[20, 8, -20]} color={"#22e0ff"} intensity={0.6} />

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color={dusk ? "#0a1124" : "#0c1530"} metalness={0.2} roughness={0.85} />
      </mesh>

      {/* building geometry clustered around each intersection */}
      {buildingSeeds.map((b, i) => (
        <Building key={`b-${i}`} position={[b[0], b[1] / 2, b[2]]} height={b[1]} width={b[3]} depth={2.5} />
      ))}
      {buildingSeeds.slice(0, 8).map((b, i) => (
        <Tree key={`t-${i}`} position={[b[0] + Math.sin(i) * 1.5, 0, b[2] + Math.cos(i) * 1.5]} />
      ))}

      {/* roads between intersections */}
      {Object.entries(interPos).flatMap(([_, [x, _y, z]]) => [20, -20].map((dx, i) => (
        <Road key={`rdx-${_}-${i}`} orientation="x" position={[x / 2, 0, z + dx * 0.0]} />
      )))}
      {[0, 0].map((_, i) => null)}
      {/* horizontal roads */}
      {Array.from(new Set(Object.values(interPos).map((p) => p[2]))).flatMap((z) => (
        [-20, -9, 0, 9, 20].map((x) => (
          <Road key={`hroad-${z}-${x}`} orientation="x" position={[x * scale, 0, z + (z > 0 ? 0 : 0)]} length={7} />
        ))
      ))}
      {/* vertical roads */}
      {Array.from(new Set(Object.values(interPos).map((p) => p[0]))).flatMap((x) => (
        [-20, -9, 0, 9, 20].map((z) => (
          <Road key={`vroad-${x}-${z}`} orientation="y" position={[x, 0, z * scale]} length={7} />
        ))
      ))}

      {/* Traffic lights at each intersection */}
      {Object.entries(safeIntersections).flatMap(([iid, inter]) => {
        const position = interPos[iid] || [0, 0, 0];
        const [x, _y, z] = position;
        return Object.entries(inter?.signals || {}).map(([dir, s]) => {
          const offs = {
            north: [0, 0, -1.1],
            south: [0, 0, 1.1],
            east: [1.1, 0, 0],
            west: [-1.1, 0, 0],
          }[dir] || [0, 0, 0];
          return (
            <TrafficLight key={`tl-${iid}-${dir}`} position={[x + offs[0], 0, z + offs[2]]} color={s?.color || "green"} />
          );
        });
      })}

      {/* vehicles */}
      {Object.entries(lanes).flatMap(([iid, dirMap]) => {
        const position = interPos[iid] || [0, 0, 0];
        const [xi, _yi, zi] = position;
        return Object.entries(dirMap || {}).flatMap(([dir, lane]) => {
          const off = (v) => {
            const pos = toFiniteNumber(v?.position, 0);
            switch (dir) {
              case "north": return [xi - 0.4, 0.135, zi - pos * scale];
              case "south": return [xi + 0.4, 0.135, zi + pos * scale];
              case "east": return [xi + pos * scale, 0.135, zi - 0.4];
              case "west": return [xi - pos * scale, 0.135, zi + 0.4];
              default: return [xi, 0, zi];
            }
          };
          return (lane?.vehicles || []).map((v) => {
            const [px, py, pz] = off(v);
            const c = COLOR_FOR_TYPE[v?.type] || "#ffffff";
            const length = Math.max(0.6, Math.min(2.6, toFiniteNumber(v?.length, 1) * SCALE));
            return (
              <Vehicle
                key={`v-${iid}-${dir}-${v?.id || Math.random()}`}
                position={[px, py, pz]}
                color={c}
                length={length}
                isEmergency={Boolean(v?.is_emergency)}
              />
            );
          });
        });
      })}

      {/* Sky / Night mood */}
      {dusk && <Stars radius={80} depth={50} count={1200} factor={4} fade speed={0.3} />}
      {last?.weather?.rain && <Clouds3D />}
    </>
  );
}

function Clouds3D() {
  return (
    <>
      <Cloud position={[20, 14, -15]} speed={0.1} opacity={0.55} segments={20} />
      <Cloud position={[-20, 16, 20]} speed={0.1} opacity={0.55} segments={20} />
    </>
  );
}

export default function TwinPage({ last }) {
  const [dusk, setDusk] = useState(false);
  const totalVehicles = Object.values(last?.lanes || {}).reduce((acc, dirM) =>
    acc + Object.values(dirM).reduce((a, l) => a + (l.vehicles?.length || 0), 0), 0);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold">3D Digital Twin</h1>
          <p className="text-[12px] text-slate-400">Buildings · Roads · Signals · Live Vehicles · Weather · Day/Night</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="pill-cyan">{totalVehicles} live vehicles</span>
          <button onClick={() => setDusk(false)} className={clsx("px-3 py-1.5 rounded-lg border text-[12px] flex items-center gap-1.5", !dusk ? "bg-neon-amber/15 border-neon-amber/40 text-neon-amber" : "bg-white/[0.04] border-white/10")}>
            <Sun className="h-3.5 w-3.5" /> Day
          </button>
          <button onClick={() => setDusk(true)} className={clsx("px-3 py-1.5 rounded-lg border text-[12px] flex items-center gap-1.5", dusk ? "bg-neon-violet/15 border-neon-violet/40 text-neon-violet" : "bg-white/[0.04] border-white/10")}>
            <Moon className="h-3.5 w-3.5" /> Night
          </button>
        </div>
      </header>

      <Section title="UrbanVerse Digital Twin" subtitle={`scenario: ${last?.scenario} · ${last?.weather?.rain ? "rain" : last?.weather?.fog ? "fog" : "clear"}`} icon={Boxes} className="p-0 overflow-hidden">
        <div className="h-[680px] relative">
          <Canvas
            camera={{ position: [12, 14, 18], fov: 50 }}
            shadows
            dpr={[1, 2]}
          >
            <color attach="background" args={[dusk ? "#050714" : "#0a1126"]} />
            <fog attach="fog" args={[dusk ? "#0a1124" : "#0a1124", 25, 75]} />
            <Suspense fallback={null}>
              <Scene last={last} dusk={dusk} />
            </Suspense>
            <OrbitControls
              enablePan
              enableZoom
              enableRotate
              autoRotate
              autoRotateSpeed={0.4}
              minDistance={4}
              maxDistance={60}
            />
          </Canvas>
          {last?.weather?.rain && (
            <div className="absolute top-4 left-4 pill-violet flex items-center gap-1.5"><CloudRain className="h-3.5 w-3.5" /> Heavy rain overlay</div>
          )}
        </div>
      </Section>
    </div>
  );
}
