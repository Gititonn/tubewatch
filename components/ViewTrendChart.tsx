"use client";

/**
 * Dependency-free inline-SVG sparkline for a single video's view-count series
 * over time (P2.4). Kept presentational so it can be reused anywhere a
 * `{ t, v }[]` series needs a compact trend line. Uses the app's design
 * tokens; the accent green matches the rest of TubeWatch.
 */

export type TrendPoint = { t: string; v: number };

export function ViewTrendChart({
  points,
  width = 240,
  height = 56,
  color = "#00ff87",
}: {
  points: TrendPoint[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;

  if (points.length < 2) {
    // A single (or zero) capture can't form a line — show a flat baseline so
    // the card still reads as "tracking, not enough history yet".
    return (
      <svg width={width} height={height} role="img" aria-label="Not enough data yet">
        <line
          x1={pad}
          y1={height / 2}
          x2={width - pad}
          y2={height / 2}
          stroke="var(--border)"
          strokeWidth={2}
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1; // avoid divide-by-zero on a flat series

  const x = (i: number) => pad + (i / (points.length - 1)) * w;
  const y = (v: number) => pad + h - ((v - min) / span) * h;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${(pad + h).toFixed(1)} L ${x(0).toFixed(1)} ${(pad + h).toFixed(1)} Z`;
  const gradId = `vt-grad-${points.length}-${Math.round(min)}-${Math.round(max)}`;

  return (
    <svg width={width} height={height} role="img" aria-label="View trend">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(values[values.length - 1])} r={2.5} fill={color} />
    </svg>
  );
}
