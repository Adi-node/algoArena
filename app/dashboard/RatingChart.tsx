"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Point {
  date: number;
  rating: number;
  title: string;
}

interface Props {
  data: Point[];
}

function formatTick(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

interface TooltipPayload {
  payload: Point;
  value: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--rc-surface-card)",
        border: "1px solid var(--rc-hairline)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "var(--rc-body)",
      }}
    >
      <p style={{ color: "var(--rc-ink)", fontWeight: 500, margin: "0 0 2px" }}>{p.title}</p>
      <p style={{ margin: 0 }}>
        Rating: <span style={{ color: "var(--rc-ink)", fontWeight: 500 }}>{Math.round(p.rating)}</span>
      </p>
      <p style={{ margin: 0, color: "var(--rc-mute)" }}>
        {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

export default function RatingChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ height: 192, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rc-mute)", fontSize: 13 }}>
        No contest history yet.
      </div>
    );
  }
  return (
    <div style={{ height: 220, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="rt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--rc-hairline)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatTick}
            stroke="var(--rc-mute)"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={["dataMin - 50", "dataMax + 50"]}
            stroke="var(--rc-mute)"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--rc-hairline-strong)" }} />
          <Area
            type="monotone"
            dataKey="rating"
            stroke="var(--rc-ink)"
            strokeWidth={1.8}
            fill="url(#rt)"
            activeDot={{ r: 4, fill: "var(--rc-ink)", stroke: "var(--rc-canvas)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
