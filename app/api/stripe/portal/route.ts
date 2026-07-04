import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" });
}

export async function GET(request: Request) {
  // NextResponse.redirect requires an ABSOLUTE URL — relative paths throw
  // "URL is malformed" (500) in production. Build absolutes off the request.
  const { origin } = new URL(request.url);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  // Comped / launch-code users have a plan but no Stripe customer — there's
  // nothing to manage, so send them back to billing instead of crashing.
  if (!profile?.stripe_customer_id) {
    return NextResponse.redirect(`${origin}/billing`);
  }

  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/settings`,
  });

  return NextResponse.redirect(session.url, 303);
}
