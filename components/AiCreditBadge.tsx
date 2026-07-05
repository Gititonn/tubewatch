"use client";

import { useEffect, useState } from "react";

type AiCalls = { used: number; limit: number; remaining: number };

// One fetch per page load even if several badges render (dashboard card +
// feed buttons); every instance shares this in-flight promise.
let statusPromise: Promise<AiCalls | null> | null = null;
function fetchAiCalls(): Promise<AiCalls | null> {
  if (!statusPromise) {
    statusPromise = fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => (d.aiCalls as AiCalls) ?? null)
      .catch(() => null);
  }
  return statusPromise;
}

/**
 * "⚡ 3/5 left" — the AI meter, shown at the point of spend. Both external
 * reviews flagged the same failure independently: a free user burns their 5
 * monthly AI answers exploring the UI and hits the wall with zero warning,
 * which reads as a punishment instead of a limit. Cost must be visible
 * BEFORE the click.
 */
export default function AiCreditBadge({ className = "" }: { className?: string }) {
  const [ai, setAi] = useState<AiCalls | null>(null);

  useEffect(() => {
    let active = true;
    fetchAiCalls().then((v) => {
      if (active) setAi(v);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ai || ai.limit <= 0) return null;

  const low = ai.remaining <= 2;
  const color = ai.remaining === 0 ? "#ff4444" : low ? "#ffaa00" : "var(--text-muted)";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{ color }}
      title={`AI answers left this month (each Analyze / Why It Worked uses 1). Resets monthly.`}
    >
      ⚡ {ai.remaining}/{ai.limit} left
    </span>
  );
}
