import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchChannels, YouTubeApiError } from "@/lib/youtube";
import { categoryLabel } from "@/lib/categories";

/**
 * "Similar channels you could track" — algorithmic suggestions (P2.2).
 *
 * Primary source is the shared discovery pool, ranked by niche match and
 * subscriber proximity to the channels the user already tracks. Because the
 * pool is still small per niche, we fall back to a live YouTube search (same
 * helper the Add-Channel search uses) when the pool can't fill the shelf —
 * mirroring how the Outlier Feed's search already dead-ends into YouTube.
 */

type Suggestion = {
  channelId: string;
  name: string;
  handle: string | null;
  thumbnail: string | null;
  subscriberCount: number;
  videoCount: number;
  medianViews: number | null;
  category: string | null;
  reason: string;
  source: "pool" | "youtube";
};

const SHELF_SIZE = 6;
const POOL_MIN_BEFORE_FALLBACK = 3;

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // The user's own tracked competitors define (a) which niches to suggest in,
  // (b) the subscriber tier they care about, and (c) what to exclude.
  const { data: tracked, error: trackedErr } = await supabase
    .from("competitor_channels")
    .select("youtube_channel_id, category, subscriber_count")
    .eq("user_id", user.id);
  if (trackedErr) return NextResponse.json({ error: trackedErr.message }, { status: 500 });

  const trackedIds = new Set((tracked ?? []).map((c) => c.youtube_channel_id));

  // Average subscriber tier per tracked category, for proximity ranking.
  const catSubs = new Map<string, { sum: number; n: number }>();
  for (const c of tracked ?? []) {
    if (!c.category) continue;
    const e = catSubs.get(c.category) ?? { sum: 0, n: 0 };
    e.sum += c.subscriber_count ?? 0;
    e.n += 1;
    catSubs.set(c.category, e);
  }
  const trackedCategories = Array.from(catSubs.keys());
  const catAvg = (cat: string | null) =>
    cat && catSubs.has(cat) ? catSubs.get(cat)!.sum / catSubs.get(cat)!.n : null;

  // Candidate universe: the discovery pool, scoped to the user's niches when
  // they track anything (otherwise suggest across all niches).
  let poolQuery = supabase
    .from("competitor_channels")
    .select("youtube_channel_id, channel_name, channel_handle, thumbnail_url, subscriber_count, video_count, median_views, category")
    .eq("is_discovery", true);
  if (trackedCategories.length > 0) poolQuery = poolQuery.in("category", trackedCategories);
  const { data: pool, error: poolErr } = await poolQuery;
  if (poolErr) return NextResponse.json({ error: poolErr.message }, { status: 500 });

  const seen = new Set<string>();
  const ranked: { s: Suggestion; prox: number }[] = [];
  for (const p of pool ?? []) {
    if (!p.youtube_channel_id || trackedIds.has(p.youtube_channel_id) || seen.has(p.youtube_channel_id)) continue;
    seen.add(p.youtube_channel_id);
    const avg = catAvg(p.category);
    ranked.push({
      prox: avg != null ? Math.abs((p.subscriber_count ?? 0) - avg) : Number.MAX_SAFE_INTEGER,
      s: {
        channelId: p.youtube_channel_id,
        name: p.channel_name,
        handle: p.channel_handle,
        thumbnail: p.thumbnail_url,
        subscriberCount: p.subscriber_count ?? 0,
        videoCount: p.video_count ?? 0,
        medianViews: p.median_views,
        category: p.category,
        reason: trackedCategories.length > 0 && p.category
          ? `Similar niche · ${categoryLabel(p.category)}`
          : "Popular in the discovery pool",
        source: "pool",
      },
    });
  }
  // Closest subscriber tier within niche first, then larger channels.
  ranked.sort((a, b) => a.prox - b.prox || b.s.subscriberCount - a.s.subscriberCount);
  const suggestions: Suggestion[] = ranked.slice(0, SHELF_SIZE).map((r) => r.s);

  // Thin pool → top up from a live YouTube search in the user's main niche.
  if (suggestions.length < POOL_MIN_BEFORE_FALLBACK && trackedCategories.length > 0) {
    const topCat = [...trackedCategories].sort((a, b) => catSubs.get(b)!.n - catSubs.get(a)!.n)[0];
    try {
      const yt = await searchChannels(`${categoryLabel(topCat)} youtube channel`, SHELF_SIZE);
      for (const ch of yt) {
        const id = ch.id ?? undefined;
        if (!id || trackedIds.has(id) || seen.has(id)) continue;
        seen.add(id);
        suggestions.push({
          channelId: id,
          name: ch.snippet?.title ?? "",
          handle: ch.snippet?.customUrl ?? null,
          thumbnail: ch.snippet?.thumbnails?.medium?.url ?? null,
          subscriberCount: parseInt(ch.statistics?.subscriberCount ?? "0"),
          videoCount: parseInt(ch.statistics?.videoCount ?? "0"),
          medianViews: null,
          category: topCat,
          reason: `Found on YouTube · ${categoryLabel(topCat)}`,
          source: "youtube",
        });
        if (suggestions.length >= SHELF_SIZE) break;
      }
    } catch (err) {
      // YouTube top-up is best-effort; pool suggestions still return. Only a
      // hard YouTube failure lands here and it must not fail the whole shelf.
      if (!(err instanceof YouTubeApiError)) {
        console.warn("similar-channels YouTube fallback failed:", err);
      }
    }
  }

  return NextResponse.json({ similar: suggestions });
}
