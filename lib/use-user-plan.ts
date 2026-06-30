"use client";

import { useEffect, useState } from "react";
import type { Plan } from "./plan";

/**
 * Client hook that resolves the current user's plan up front (via
 * /api/billing/status) so feature pages can show the Pro lock state
 * immediately instead of after a failed action. Returns `null` while loading.
 */
export function useUserPlan(): Plan | null {
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => {
        if (active) setPlan((d.plan as Plan) ?? "free");
      })
      .catch(() => {
        if (active) setPlan("free");
      });
    return () => {
      active = false;
    };
  }, []);

  return plan;
}

export function isPaid(plan: Plan | null): boolean {
  return plan === "pro" || plan === "growth";
}
