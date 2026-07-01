// Create/verify launch discount codes in Stripe: LAUNCH20/30/50 = 20/30/50% off
// for the first 3 months. Idempotent — reuses coupons by deterministic id and
// skips promotion codes that already exist.
//
// Usage:  node scripts/create-launch-codes.mjs
// Reads STRIPE_SECRET_KEY from the environment, falling back to .env.local.

import Stripe from "stripe";
import { readFileSync } from "node:fs";

function loadStripeKey() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const match = env.match(/^STRIPE_SECRET_KEY=(.+)$/m);
  if (!match) throw new Error("STRIPE_SECRET_KEY not found in env or .env.local");
  return match[1].trim().replace(/^["']|["']$/g, "");
}

// Pin a stable API version explicitly. The account default (2026-06-24.dahlia)
// rejects the standard `coupon` param on promotion code creation; an unset
// version falls back to that same account default, so we must pin an older one.
const stripe = new Stripe(loadStripeKey(), { apiVersion: "2024-06-20" });

const CODES = [
  { code: "LAUNCH20", percent_off: 20 },
  { code: "LAUNCH30", percent_off: 30 },
  { code: "LAUNCH50", percent_off: 50 },
];

for (const { code, percent_off } of CODES) {
  const existing = await stripe.promotionCodes.list({ code, limit: 1 });
  if (existing.data.length) {
    console.log(`= ${code} promotion code already exists (${existing.data[0].id}) — skipping`);
    continue;
  }

  const couponId = `${code.toLowerCase()}-3mo`;
  let coupon;
  try {
    coupon = await stripe.coupons.retrieve(couponId);
    console.log(`  reusing coupon ${couponId}`);
  } catch {
    coupon = await stripe.coupons.create({
      id: couponId,
      percent_off,
      duration: "repeating",
      duration_in_months: 3,
      name: `${code} — ${percent_off}% off for 3 months`,
    });
    console.log(`  created coupon ${coupon.id}`);
  }

  const promo = await stripe.promotionCodes.create({ coupon: coupon.id, code });
  console.log(`+ ${code} → promo ${promo.id}`);
}

console.log("Done.");
