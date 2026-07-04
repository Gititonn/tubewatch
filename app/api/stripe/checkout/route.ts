import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { STRIPE_PLAN_CONFIG } from "@/lib/plans";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" });
}

type Plan = keyof typeof STRIPE_PLAN_CONFIG;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Absolute URL required — a relative path throws "URL is malformed" (500).
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const contentType = request.headers.get("content-type") ?? "";
  let planParam: string | undefined;
  let cycleParam: string | undefined;
  if (contentType.includes("application/json")) {
    const body = await request.json() as { plan?: string; cycle?: string };
    planParam = body.plan;
    cycleParam = body.cycle;
  } else {
    const formData = await request.formData();
    planParam = formData.get("plan")?.toString();
    cycleParam = formData.get("cycle")?.toString();
  }
  const plan: Plan = planParam === "growth" ? "growth" : "pro";
  const planConfig = STRIPE_PLAN_CONFIG[plan];
  const annual = cycleParam === "annual";
  const unitAmount = annual ? planConfig.unit_amount_annual : planConfig.unit_amount;
  const interval: "year" | "month" = annual ? "year" : "month";

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single();

  const stripe = getStripe();
  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const { origin } = new URL(request.url);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    // Let customers enter launch/discount codes (LAUNCH20, etc.) at checkout.
    // Without this, Stripe never shows the promo field and no code can be redeemed.
    allow_promotion_codes: true,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: planConfig.name },
          unit_amount: unitAmount,
          recurring: { interval },
        },
        quantity: 1,
      },
    ],
    // Stamp the plan onto the subscription so the webhook resolves it from
    // metadata rather than fragile amount-matching (survives price changes).
    subscription_data: { metadata: { supabase_user_id: user.id, plan } },
    success_url: `${origin}/billing?upgraded=true`,
    cancel_url: `${origin}/billing`,
    metadata: { supabase_user_id: user.id, plan },
  });

  return NextResponse.redirect(session.url!, 303);
}
