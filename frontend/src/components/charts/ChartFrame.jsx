import React from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const palette = ["#22e0ff", "#8b5cf6", "#22d3a5", "#ff5d7a", "#f5b942", "#60a5fa", "#a78bfa"];

export function LineArea({ data, x = "x", y = "y", height = 200, color = "#22e0ff" }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gx-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.65} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey={x} stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
        <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey={y} stroke={color} fill={`url(#gx-${color.slice(1)})`} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LineChartM({ data, x = "x", series = [{ k: "y", color: "#22e0ff" }], height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey={x} stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
        <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {series.map((s, i) => (
          <Line key={s.k} type="monotone" dataKey={s.k} stroke={s.color || palette[i]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarSeries({ data, x = "x", y = "y", color = "#8b5cf6", height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey={x} stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
        <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey={y} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieBundle({ data, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" stroke="rgba(5,7,20,0.7)" strokeWidth={2}>
          {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RadarBundle({ data, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.7)" }} />
        <PolarRadiusAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }} />
        <Radar name="Live" dataKey="value" stroke="#22e0ff" fill="#22e0ff" fillOpacity={0.35} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle = {
  background: "rgba(8, 12, 30, 0.92)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e5e7eb",
};
