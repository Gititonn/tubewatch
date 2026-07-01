import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { STRIPE_PLAN_CONFIG } from "@/lib/plans";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" });
}

/**
 * Resolve a plan from a subscription. Prefer the plan we stamped into
 * subscription metadata at checkout (survives price changes and annual vs.
 * monthly); fall back to matching the charged amount against the current
 * config (monthly, or annual = 10× monthly). Never hardcode cents — that
 * silently downgraded paying customers the last time prices changed.
 */
function planFromSubscription(sub: Stripe.Subscription): "pro" | "growth" | "free" {
  const metaPlan = sub.metadata?.plan;
  if (metaPlan === "pro" || metaPlan === "growth") return metaPlan;

  const amount = sub.items.data[0]?.price?.unit_amount ?? 0;
  for (const key of ["pro", "growth"] as const) {
    const monthly = STRIPE_PLAN_CONFIG[key].unit_amount;
    if (amount === monthly || amount === monthly * 10) return key;
  }
  return "free";
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.supabase_user_id;
    const plan = session.metadata?.plan === "growth" ? "growth" : "pro";

    if (userId && session.subscription) {
      await supabase
        .from("profiles")
        .update({
          plan,
          stripe_subscription_id: session.subscription as string,
        })
        .eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const plan = planFromSubscription(subscription);
    await supabase
      .from("profiles")
      .update({ plan, stripe_subscription_id: subscription.id })
      .eq("stripe_subscription_id", subscription.id);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    await supabase
      .from("profiles")
      .update({ plan: "free", stripe_subscription_id: null })
      .eq("stripe_subscription_id", subscription.id);
  }

  return NextResponse.json({ received: true });
}
