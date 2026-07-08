import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { planLimits } from "@/lib/entitlements";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, stripe_customer_id, stripe_subscription_id, ai_calls_used, ai_calls_reset_at")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const plan = (profile.plan === "pro" || profile.plan === "growth" ? profile.plan : "free") as
    | "free"
    | "pro"
    | "growth";

  // AI meter for UI display. The counter resets lazily inside consume_ai_call,
  // so a stale row can show last month's usage — mirror that reset here for
  // display only (past reset_at means the next call starts a fresh month).
  const limit = planLimits(plan).aiCallsPerMonth;
  const resetAt = profile.ai_calls_reset_at as string | null;
  const stale = resetAt != null && new Date(resetAt).getTime() <= Date.now();
  const used = stale ? 0 : ((profile.ai_calls_used as number | null) ?? 0);

  // First AI teardown is free (doesn't touch the meter) — the UI uses this to
  // render the zero-risk "first one's on us" state until it's redeemed.
  const { count: teardowns } = await supabase
    .from("ai_teardowns")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return NextResponse.json({
    plan,
    stripe_customer_id: profile.stripe_customer_id as string | null,
    stripe_subscription_id: profile.stripe_subscription_id as string | null,
    aiCalls: { used, limit, remaining: Math.max(0, limit - used), resetAt },
    firstTeardownFree: (teardowns ?? 0) === 0,
  });
}
