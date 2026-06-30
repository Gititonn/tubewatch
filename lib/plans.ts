import type { Plan } from "./plan";

/**
 * SINGLE SOURCE OF TRUTH for plan names, prices, features, and CTA copy.
 *
 * Landing page, billing page, paywalls, and Stripe checkout all import from
 * here so they can never drift apart again. Prices are defined once as dollars;
 * Stripe's `unit_amount` (cents) is derived, never hand-typed.
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
}

export const PLANS: Record<Plan, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    paid: false,
    tagline: "Testing the water.",
    ctaFree: "Get started free",
    features: [
      "1 competitor channel",
      "30-day history",
      "Basic outlier feed",
      "Dashboard & video stats",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    paid: true,
    highlight: true,
    tagline: "Includes your dedicated 24/7 AI Channel Strategist to help hit monetization requirements.",
    ctaUpgrade: "Upgrade to Pro",
    features: [
      "10 competitor channels",
      "Full history",
      "🧠 AI Strategy Coach + “Why It Worked” insights (100 Credits/mo)",
      "Trending & Rising",
      "Patterns analysis",
      "Compare tool",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthly: 49,
    paid: true,
    tagline: "Perfect for scaling an established side-income stream.",
    ctaUpgrade: "Upgrade to Growth",
    features: [
      "Unlimited AI Strategy + Deep Video Audits & Custom AI Blueprints",
      "Everything in Pro",
      "Priority sync (6h vs 24h)",
      "API access (coming soon)",
    ],
  },
};

export const PLAN_LIST: PlanDef[] = [PLANS.free, PLANS.pro, PLANS.growth];

/** One global trust line. No trial language — TubeWatch is free-forever + upgrades. */
export const PRICING_FOOTNOTE =
  "Free forever for small channels · No credit card required · Cancel anytime";

/** Stripe reads the SAME numbers (cents derived from priceMonthly). */
export const STRIPE_PLAN_CONFIG = {
  pro: { name: `TubeWatch ${PLANS.pro.name}`, unit_amount: PLANS.pro.priceMonthly * 100 },
  growth: { name: `TubeWatch ${PLANS.growth.name}`, unit_amount: PLANS.growth.priceMonthly * 100 },
} as const;
