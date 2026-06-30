"use client";

import { useState, useEffect } from "react";

interface Row {
  date: string;
  views: number;
  subsGained: number;
  subsLost: number;
  netSubs: number;
  watchMinutes: number;
}

interface Totals {
  views: number;
  subsGained: number;
  subsLost: number;
  netSubs: number;
  watchHours: number;
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

const RANGES = [
  { label: "7D", days: 7 },
  { label: "28D", days: 28 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
];

const METRICS = [
  { key: "views", label: "Views", color: "#00ff87" },
  { key: "netSubs", label: "Subscribers", color: "#3b82f6" },
  { key: "watchMinutes", label: "Watch Time", color: "#8b5cf6" },
];

export default function AnalyticsChart() {
  const [range, setRange] = useState(28);
  const [metric, setMetric] = useState<"views" | "netSubs" | "watchMinutes">("views");
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/youtube/analytics?range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRows(data.rows ?? []);
          setTotals(data.totals ?? null);
        }
      })
      .catch(() => setError("fetch_failed"))
      .finally(() => setLoading(false));
  }, [range]);

  const activeMetric = METRICS.find((m) => m.key === metric)!;
  const values = rows.map((r) => r[metric] as number);
  const maxVal = Math.max(...values, 1);
  const totalVal =
    metric === "views"
      ? totals?.views
      : metric === "netSubs"
      ? totals?.netSubs
      : totals
      ? Math.round(totals.watchHours * 60)
      : undefined;

  if (error === "google_not_connected") {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
      >
        <div className="text-3xl mb-3">📊</div>
        <p className="text-foreground font-semibold mb-1 text-sm">
          Connect Google for live charts
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          Daily views, subscriber growth, and watch time — all in real time.
        </p>
        <a
          href="/api/auth/google/connect"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-black text-sm"
          style={{ background: "#00ff87" }}
        >
          Connect Google →
        </a>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {activeMetric.label} over time
          </div>
          {totals && !loading && (
            <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {fmt(totalVal ?? 0)} total in last {range} days
            </div>
          )}
        </div>

        {/* Range selector */}
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: range === r.days ? "#00ff87" : "var(--bg)",
                color: range === r.days ? "#000" : "var(--text-secondary)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric tabs */}
      <div className="flex gap-1 mb-4">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key as typeof metric)}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{
              color: metric === m.key ? m.color : "var(--text-secondary)",
              background: metric === m.key ? m.color + "18" : "transparent",
              border: `1px solid ${metric === m.key ? m.color + "44" : "transparent"}`,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>
        </div>
      ) : rows.length === 0 ? (
        <div className="h-40 flex items-center justify-center">
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>No data for this period</div>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-px h-40">
            {rows.map((row, i) => {
              const val = row[metric] as number;
              const pct = (val / maxVal) * 100;
              const isPositive = val >= 0;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end group relative"
                  title={`${row.date}\n${fmt(Math.abs(val))} ${activeMetric.label}`}
                >
                  <div
                    className="w-full rounded-t transition-all group-hover:opacity-100"
                    style={{
                      height: `${Math.max(Math.abs(pct), 2)}%`,
                      background: isPositive ? activeMetric.color : "#ff4444",
                      opacity: 0.75,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis labels (just first and last date) */}
          <div className="flex justify-between mt-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {rows[0]?.date}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {rows[rows.length - 1]?.date}
            </span>
          </div>
        </>
      )}

      {/* Summary row */}
      {totals && !loading && (
        <div
          className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          {[
            { label: "Views", val: fmt(totals.views) },
            { label: "Subs gained", val: "+" + fmt(totals.subsGained), color: "#00ff87" },
            { label: "Subs lost", val: "-" + fmt(totals.subsLost), color: "#ff4444" },
            { label: "Watch hours", val: fmt(totals.watchHours) },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              <div
                className="text-sm font-bold mt-0.5"
                style={{ color: s.color ?? "var(--text-primary)" }}
              >
                {s.val}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
