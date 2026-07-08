import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";
import { buildDigest, renderEmail } from "@/lib/weekly-email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FROM = "TubeWatch <hello@tubewatchhq.com>";
const BASE = "https://www.tubewatchhq.com";
const RESEND_COOLDOWN_MS = 6 * 24 * 60 * 60 * 1000; // don't re-send within 6 days
const CONCURRENCY = 4; // gentle on Resend + Anthropic + Supabase

async function mapLimited<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  async function runner() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        await worker(items[i]);
      } catch {
        /* per-user failure never stops the batch */
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
}

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
  }

  // Instantiated inside the handler (never module scope) so a missing key at
  // build time can't break page-data collection — same rule as the Supabase
  // clients.
  const resend = new Resend(process.env.RESEND_API_KEY);
  const svc = createServiceClient();
  const cutoff = new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString();

  // Eligible: opted in, and not emailed in the last 6 days (idempotency guard
  // against a double cron fire).
  const { data: profiles, error } = await svc
    .from("profiles")
    .select("id, email, plan, weekly_email_token, weekly_email_last_sent_at")
    .eq("weekly_email_enabled", true)
    .or(`weekly_email_last_sent_at.is.null,weekly_email_last_sent_at.lt.${cutoff}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Only users with a connected channel (an activated user) get the digest.
  const { data: channelRows } = await svc.from("channels").select("user_id");
  const connected = new Set((channelRows ?? []).map((c) => c.user_id));

  const recipients = (profiles ?? []).filter(
    (p) => p.email && connected.has(p.id)
  );

  const stats = { eligible: recipients.length, sent: 0, skippedNoBreakouts: 0, failed: 0 };

  await mapLimited(recipients, CONCURRENCY, async (p) => {
    const isPaid = p.plan === "pro" || p.plan === "growth";
    const digest = await buildDigest(svc, p.id, isPaid);

    // Never send an empty email — a quiet week for a user is a skip, not spam.
    if (digest.breakouts.length === 0) {
      stats.skippedNoBreakouts++;
      return;
    }

    const unsubscribeUrl = `${BASE}/api/email/unsubscribe?token=${p.weekly_email_token}`;
    const { subject, html } = renderEmail({ digest, isPaid, unsubscribeUrl });

    const { error: sendErr } = await resend.emails.send({
      from: FROM,
      to: p.email as string,
      subject,
      html,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
    });
    if (sendErr) {
      stats.failed++;
      console.warn("weekly-email send failed:", p.id, sendErr.message ?? sendErr);
      return;
    }

    await svc
      .from("profiles")
      .update({ weekly_email_last_sent_at: new Date().toISOString() })
      .eq("id", p.id);
    stats.sent++;
  });

  return NextResponse.json({ ok: true, ...stats });
}
