"use client";

import { useEffect, useState } from "react";

type AiStatus = {
  aiCalls: { used: number; limit: number; remaining: number } | null;
  firstTeardownFree: boolean;
};

// One fetch per page load even if several badges render (dashboard card +
// feed buttons); every instance shares this in-flight promise.
let statusPromise: Promise<AiStatus | null> | null = null;
export function fetchAiStatus(): Promise<AiStatus | null> {
  if (!statusPromise) {
    statusPromise = fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => ({
        aiCalls: (d.aiCalls as AiStatus["aiCalls"]) ?? null,
        firstTeardownFree: !!d.firstTeardownFree,
      }))
      .catch(() => null);
  }
  return statusPromise;
}

/** Call after a teardown is consumed so freebie/remaining states refresh. */
export function invalidateAiStatus() {
  statusPromise = null;
}

/**
 * The AI meter, shown at the point of spend. Both external reviews flagged
 * the same failure independently: a free user burns their 5 monthly AI
 * answers exploring the UI and hits the wall with zero warning. Cost must be
 * visible BEFORE the click — and the FIRST teardown is free (server-enforced),
 * so before it's redeemed this renders the zero-risk gift state instead of a
 * scary countdown.
 */
export default function AiCreditBadge({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    let active = true;
    fetchAiStatus().then((v) => {
      if (active) setStatus(v);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!status) return null;

  if (status.firstTeardownFree) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap ${className}`}
        style={{ color: "#00ff87" }}
        title="Your first AI teardown is on the house — it won't use your monthly credits."
      >
        🎁 First teardown free
      </span>
    );
  }

  const ai = status.aiCalls;
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
