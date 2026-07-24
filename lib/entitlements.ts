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

/**
 * Founder / admin bypass. Emails listed in the ADMIN_EMAILS env var (comma-
 * separated) are exempt from plan caps — so the founder can dogfood and track
 * every channel they watch without hitting a limit. Set ADMIN_EMAILS in Vercel;
 * leave it unset in any environment where no one should be exempt.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

type SB = ReturnType<typeof createClient>;

export type ConsumeResult =
  | { ok: true; remaining: number }
  | { ok: false; error: string; status: number };

/**
 * Consume one AI call for the user, resetting the counter at the start of each
 * calendar month. Delegates to the `consume_ai_call` Postgres function, which
 * takes a row lock and does the check-and-increment as one atomic unit.
 *
 * This used to be a read-modify-write in application code (select used count,
 * check limit, then update) — a classic check-then-act race: two concurrent
 * requests could both read "4 used, limit 5," both pass the check, and both
 * write 5, letting a user go over their monthly cap. The DB function closes
 * that window.
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

  const { data, error } = await supabase
    .rpc("consume_ai_call", { p_user_id: userId, p_limit: limit })
    .single();

  if (error || !data) {
    return { ok: false, error: "Couldn't check your AI usage — try again.", status: 500 };
  }

  const { ok, used, reset_at } = data as { ok: boolean; used: number; reset_at: string };

  if (!ok) {
    const upsell = plan === "growth" ? "" : "Upgrade for a higher cap, or your allowance ";
    return {
      ok: false,
      error: `You've used all ${limit} AI answers this month. ${upsell}resets ${reset_at.slice(0, 10)}.`,
      status: 429,
    };
  }

  return { ok: true, remaining: limit - used };
}
