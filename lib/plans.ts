import type { Plan } from "./plan";

/**
 * SINGLE SOURCE OF TRUTH for plan names, prices, limits, features, and CTA copy.
 *
 * Landing page, billing page, paywalls, entitlement checks, and Stripe checkout
 * all import from here so they can never drift apart again. Prices are defined
 * once as dollars; Stripe's `unit_amount` (cents) is derived, never hand-typed.
 *
 * `aiCallsPerMonth` and `competitorLimit` are ENFORCED in code (lib/entitlements.ts,
 * the AI routes, and the competitor route) — not just marketing copy.
 */

export interface PlanDef {
  id: Plan;
  name: string;
  priceMonthly: number; // dollars — drives both display and Stripe
  tagline: string;
  features: string[]; // canonical list, identical on landing + billing
  ctaFree?: string; // free-tier call to action
  ctaUpgrade?: string; // paid-tier call to action
  highlight?: boolean; // "MOST POPULAR"
  paid: boolean;
  aiCallsPerMonth: number; // AI Coach / Why-It-Worked answers per calendar month
  competitorLimit: number; // max tracked competitor channels
}

export const PLANS: Record<Plan, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    paid: false,
    aiCallsPerMonth: 5,
    competitorLimit: 3,
    tagline: "Spy on your niche and taste the AI coach — free forever.",
    ctaFree: "Get started free",
    features: [
      "Track up to 3 competitor channels",
      "Their top overperforming videos",
      "Your age-adjusted outlier scores",
      "5 AI “Why It Worked” explanations / mo",
      "30-day history",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    paid: true,
    highlight: true,
    aiCallsPerMonth: 300,
    competitorLimit: 10,
    tagline: "The full niche outlier radar + AI coach for creators growing a real channel.",
    ctaUpgrade: "Upgrade to Pro",
    features: [
      "Track up to 10 competitor channels",
      "Full outlier radar — your videos + theirs",
      "🧠 AI Strategy Coach + “Why It Worked” — 300/mo",
      "Full history",
      "Trending, Rising & Patterns",
      "Compare tool",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthly: 49,
    paid: true,
    aiCallsPerMonth: 1500,
    competitorLimit: 25,
    tagline: "Done-for-you: a monthly plan of what to make next, built from what's winning in your niche.",
    ctaUpgrade: "Upgrade to Growth",
    features: [
      "Everything in Pro",
      "Track up to 25 competitor channels",
      "🧠 AI Strategy Coach — 1,500/mo",
      "🔬 Deep per-video audits",
      "📋 Monthly next-video plan from live niche outliers",
      "Priority sync (6h vs 24h)",
    ],
  },
};

export const PLAN_LIST: PlanDef[] = [PLANS.free, PLANS.pro, PLANS.growth];

/** Annual billing = 2 months free (pay for 10 months, get 12). */
export const ANNUAL_MONTHS_FREE = 2;
export function annualPrice(plan: PlanDef): number {
  return plan.priceMonthly * (12 - ANNUAL_MONTHS_FREE);
}

/** One global trust line. No trial language — TubeWatch is free-forever + upgrades. */
export const PRICING_FOOTNOTE =
  "Free forever for small channels · No credit card required · Cancel anytime · Save 2 months with annual billing";

/**
 * Stripe reads the SAME numbers (cents derived from priceMonthly). Annual is
 * 10× the monthly cents (2 months free), which is also what the webhook matches
 * on as a fallback (`monthly` or `monthly * 10`).
 */
export const STRIPE_PLAN_CONFIG = {
  pro: {
    name: `TubeWatch ${PLANS.pro.name}`,
    unit_amount: PLANS.pro.priceMonthly * 100,
    unit_amount_annual: annualPrice(PLANS.pro) * 100,
  },
  growth: {
    name: `TubeWatch ${PLANS.growth.name}`,
    unit_amount: PLANS.growth.priceMonthly * 100,
    unit_amount_annual: annualPrice(PLANS.growth) * 100,
  },
} as const;
