import type { createClient } from "@/lib/supabase/server";

export type Plan = "free" | "pro" | "growth";

/** Look up a user's plan, defaulting to "free" if the row/value is missing. */
export async function getUserPlan(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Plan> {
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = data?.plan as string | undefined;
  return plan === "pro" || plan === "growth" ? plan : "free";
}

export function isPaidPlan(plan: Plan): boolean {
  return plan === "pro" || plan === "growth";
}
