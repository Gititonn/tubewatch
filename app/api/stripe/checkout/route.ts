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
    return NextResponse.redirect("/login");
  }

  const contentType = request.headers.get("content-type") ?? "";
  let planParam: string | undefined;
  if (contentType.includes("application/json")) {
    const body = await request.json() as { plan?: string };
    planParam = body.plan;
  } else {
    const formData = await request.formData();
    planParam = formData.get("plan")?.toString();
  }
  const plan: Plan = planParam === "growth" ? "growth" : "pro";
  const planConfig = STRIPE_PLAN_CONFIG[plan];

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
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: planConfig.name },
          unit_amount: planConfig.unit_amount,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/billing?upgraded=true`,
    cancel_url: `${origin}/billing`,
    metadata: { supabase_user_id: user.id, plan },
  });

  return NextResponse.redirect(session.url!, 303);
}
