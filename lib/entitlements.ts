import type { createClient } from "@/lib/supabase/server";
import type { Plan } from "./plan";
import { PLANS } from "./plans";

/**
 * Central, ENFORCED plan limits. These back the numbers shown on the pricing
 * page — unlike the old copy, the app actually holds users to them.
 */
export function planLimits(plan: Plan) {
  return {
    aiCallsPerMonth: PLANS[plan].aiCallsPerMonth,
    competitorLimit: PLANS[plan].competitorLimit,
  };
}

type SB = ReturnType<typeof createClient>;

/** First instant of the month after `from` (UTC). */
function startOfNextMonth(from: Date): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
}

export type ConsumeResult =
  | { ok: true; remaining: number }
  | { ok: false; error: string; status: number };

/**
 * Consume one AI call for the user, resetting the counter at the start of each
 * calendar month. Read-modify-write on the user's own profile row (RLS-safe);
 * good enough at current scale — a rare concurrent double-spend is harmless.
 */
export async function consumeAiCall(
  supabase: SB,
  userId: string,
  plan: Plan
): Promise<ConsumeResult> {
  const limit = PLANS[plan].aiCallsPerMonth;
  if (limit <= 0) {
    return { ok: false, error: "Upgrade to a paid plan to use the AI coach.", status: 402 };
  }

  const { data } = await supabase
    .from("profiles")
    .select("ai_calls_used, ai_calls_reset_at")
    .eq("id", userId)
    .single();

  const now = new Date();
  let used: number = data?.ai_calls_used ?? 0;
  let resetAt = data?.ai_calls_reset_at ? new Date(data.ai_calls_reset_at) : null;

  if (!resetAt || now >= resetAt) {
    used = 0;
    resetAt = startOfNextMonth(now);
  }

  if (used >= limit) {
    const upsell = plan === "growth" ? "" : "Upgrade for a higher cap, or your allowance ";
    return {
      ok: false,
      error: `You've used all ${limit} AI answers this month. ${upsell}resets ${resetAt
        .toISOString()
        .slice(0, 10)}.`,
      status: 429,
    };
  }

  await supabase
    .from("profiles")
    .update({ ai_calls_used: used + 1, ai_calls_reset_at: resetAt.toISOString() })
    .eq("id", userId);

  return { ok: true, remaining: limit - used - 1 };
}
