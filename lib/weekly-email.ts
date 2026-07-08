import Anthropic from "@anthropic-ai/sdk";
import type { createServiceClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/categories";

/**
 * Weekly Breakout Email builder (spec: docs/specs/weekly-email.md).
 *
 * Reuses the outlier-feed logic (a user's tracked competitors ∪ the discovery
 * pool, scoped to their niches) but filtered to videos that broke out THIS
 * WEEK — because the email's promise is "what's hot in your niche right now,"
 * not an all-time list. No new sync: reads what the daily cron already scored.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BASE = "https://www.tubewatchhq.com"; // www host — apex 308-redirects
const FRESH_DAYS = 10; // "this week" with slack for a weekly cadence

type ServiceClient = ReturnType<typeof createServiceClient>;

export type Breakout = {
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  outlier_score: number;
  channel_name: string | null;
  category: string | null;
};

export type Digest = {
  breakouts: Breakout[];
  aiPick: { breakout: Breakout; line: string } | null;
};

/**
 * The user's niche breakouts this week. Channel scope = their tracked
 * competitors plus the shared discovery pool in the categories they track;
 * if they track nothing yet, fall back to the whole discovery pool so the
 * email still has signal.
 */
export async function buildDigest(
  svc: ServiceClient,
  userId: string,
  isPaid: boolean
): Promise<Digest> {
  const { data: owned } = await svc
    .from("competitor_channels")
    .select("id, category")
    .eq("user_id", userId);

  const ownedIds = (owned ?? []).map((c) => c.id);
  const categories = Array.from(
    new Set((owned ?? []).map((c) => c.category).filter(Boolean))
  ) as string[];

  let discoveryQ = svc.from("competitor_channels").select("id").eq("is_discovery", true);
  if (categories.length > 0) discoveryQ = discoveryQ.in("category", categories);
  const { data: discovery } = await discoveryQ;

  const channelIds = Array.from(
    new Set([...ownedIds, ...((discovery ?? []).map((c) => c.id))])
  );
  if (channelIds.length === 0) return { breakouts: [], aiPick: null };

  const cutoff = new Date(Date.now() - FRESH_DAYS * 86_400_000).toISOString();
  const wanted = isPaid ? 3 : 1;

  const { data: rows } = await svc
    .from("competitor_videos")
    .select(
      "youtube_video_id, title, thumbnail_url, outlier_score, published_at, competitor_channels(channel_name, category)"
    )
    .in("competitor_channel_id", channelIds)
    .gte("outlier_score", 2) // a real breakout, not just above-median
    .gte("published_at", cutoff)
    .order("outlier_score", { ascending: false })
    .limit(wanted);

  const breakouts: Breakout[] = (rows ?? []).map((r) => {
    const ch = Array.isArray(r.competitor_channels)
      ? r.competitor_channels[0]
      : r.competitor_channels;
    return {
      youtube_video_id: r.youtube_video_id,
      title: r.title,
      thumbnail_url: r.thumbnail_url,
      outlier_score: Number(r.outlier_score),
      channel_name: ch?.channel_name ?? null,
      category: ch?.category ?? null,
    };
  });

  if (breakouts.length === 0) return { breakouts: [], aiPick: null };

  // AI pick only for paid users — a one-line "make your version" reason for
  // the strongest breakout. System-generated, so it does NOT touch the user's
  // AI credit meter, and it degrades to a template line on any failure.
  let aiPick: Digest["aiPick"] = null;
  if (isPaid) {
    const top = breakouts[0];
    aiPick = { breakout: top, line: await aiPickLine(top) };
  }

  return { breakouts, aiPick };
}

async function aiPickLine(b: Breakout): Promise<string> {
  const fallback = `Overperforming its channel ${b.outlier_score.toFixed(1)}x — the topic is hot in ${categoryLabel(b.category)} right now.`;
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 90,
      messages: [
        {
          role: "user",
          content: `A YouTube video titled "${b.title}" is outperforming its channel ${b.outlier_score.toFixed(1)}x in the ${categoryLabel(b.category)} niche. In ONE sentence (max 25 words), tell a small creator why they should make their own version and what angle to take. No preamble, just the sentence.`,
        },
      ],
    });
    const text = msg.content.find((c) => c.type === "text");
    const line = text && "text" in text ? text.text.trim() : "";
    return line || fallback;
  } catch {
    return fallback;
  }
}

// ── Email HTML (table-based, inline styles — email-client safe) ──────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function breakoutRow(b: Breakout): string {
  const thumb = b.thumbnail_url ? esc(b.thumbnail_url) : `${BASE}/og.png`;
  const watch = `${BASE}/competitors/outliers`;
  return `
  <tr>
    <td style="padding:12px 0;border-bottom:1px solid #262626;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="160" valign="top">
          <a href="${watch}"><img src="${thumb}" width="150" alt="" style="width:150px;border-radius:8px;display:block;"></a>
        </td>
        <td valign="top" style="padding-left:14px;">
          <div style="display:inline-block;background:rgba(249,115,22,0.15);color:#f97316;font-weight:800;font-size:12px;padding:2px 8px;border-radius:999px;margin-bottom:6px;">🔥 ${b.outlier_score.toFixed(1)}x its channel's normal</div>
          <div style="color:#ffffff;font-size:15px;font-weight:700;line-height:1.35;margin-bottom:4px;">${esc(b.title)}</div>
          <div style="color:#9CA3AF;font-size:12px;">${esc(b.channel_name ?? "")} · ${esc(categoryLabel(b.category))}</div>
        </td>
      </tr></table>
    </td>
  </tr>`;
}

export function renderEmail(opts: {
  digest: Digest;
  isPaid: boolean;
  unsubscribeUrl: string;
}): { subject: string; html: string } {
  const { digest, isPaid, unsubscribeUrl } = opts;
  const n = digest.breakouts.length;
  const subject =
    n === 1
      ? `🔥 A breakout in your niche this week`
      : `🔥 ${n} breakouts in your niche this week`;

  const rows = digest.breakouts.map(breakoutRow).join("");

  const aiBlock = digest.aiPick
    ? `
    <tr><td style="padding:20px 0 4px;">
      <div style="background:linear-gradient(135deg,rgba(168,85,247,0.15),rgba(168,85,247,0.04));border:1px solid rgba(168,85,247,0.35);border-radius:12px;padding:16px;">
        <div style="color:#c084fc;font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">🧠 Make your version</div>
        <div style="color:#e5e7eb;font-size:14px;line-height:1.5;">${esc(digest.aiPick.line)}</div>
      </div>
    </td></tr>`
    : "";

  const upsell = !isPaid
    ? `
    <tr><td style="padding:18px 0 4px;">
      <div style="background:#111827;border:1px solid #262626;border-radius:12px;padding:16px;text-align:center;">
        <div style="color:#9CA3AF;font-size:14px;margin-bottom:10px;">See <strong style="color:#fff;">all 3</strong> breakouts in your niche + an AI plan for your next upload.</div>
        <a href="${BASE}/billing" style="display:inline-block;background:#00ff87;color:#0f0f0f;font-weight:800;font-size:14px;text-decoration:none;padding:10px 22px;border-radius:10px;">Upgrade to Pro →</a>
      </div>
    </td></tr>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#0f0f0f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;">
    <tr><td align="center" style="padding:28px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding-bottom:8px;">
          <span style="color:#fff;font-size:22px;font-weight:900;">Tube<span style="color:#00ff87;">Watch</span></span>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <div style="color:#9CA3AF;font-size:14px;">Here's what's breaking out in your niche this week — find these before you film your next one.</div>
        </td></tr>
        ${aiBlock}
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>
        ${upsell}
        <tr><td style="padding:22px 0 4px;text-align:center;">
          <a href="${BASE}/competitors/outliers" style="display:inline-block;background:#f97316;color:#0f0f0f;font-weight:800;font-size:14px;text-decoration:none;padding:11px 26px;border-radius:10px;">Open your Breakouts feed →</a>
        </td></tr>
        <tr><td style="padding:22px 0 0;border-top:1px solid #1a1a1a;margin-top:12px;">
          <div style="color:#4B5563;font-size:11px;line-height:1.6;text-align:center;">
            You're getting this because you have a channel connected on TubeWatch.<br>
            <a href="${unsubscribeUrl}" style="color:#6b7280;">Unsubscribe from weekly emails</a> ·
            <a href="${BASE}/settings" style="color:#6b7280;">Manage preferences</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html };
}
