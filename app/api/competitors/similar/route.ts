import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchChannels, searchNicheChannels, YouTubeApiError } from "@/lib/youtube";
import { categoryLabel } from "@/lib/categories";

/**
 * "Similar channels you could track" — algorithmic suggestions (P2.2).
 *
 * Primary source is the shared discovery pool, ranked by niche match and
 * subscriber proximity to the channels the user already tracks; a live
 * YouTube lookup tops the shelf up when the pool runs thin.
 *
 * Every candidate — pool or YouTube — must pass the same size band used by
 * the connect-time auto-suggest: within ~10x of the user's typical tracked
 * channel on a log scale, at least 5 uploads. Before this filter the shelf
 * served 45M-sub behemoths and 0-sub shells next to a 300K-sub list; a
 * suggestion that ignores the user's size reads as noise, and noise here
 * poisons trust in the scoring everywhere else.
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
const MIN_SUBS = 1_000;
const MIN_VIDEOS = 5;
const DEFAULT_REF_SUBS = 10_000;
// A peer is within one order of magnitude of the user's typical tracked size.
const BAND_SPAN = 10;

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function fmtSubs(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // The user's own tracked competitors define (a) which niches to suggest in,
  // (b) the subscriber tier they care about, and (c) what to exclude.
  const { data: tracked, error: trackedErr } = await supabase
    .from("competitor_channels")
    .select("id, youtube_channel_id, category, subscriber_count")
    .eq("user_id", user.id);
  if (trackedErr) return NextResponse.json({ error: trackedErr.message }, { status: 500 });

  const trackedIds = new Set((tracked ?? []).map((c) => c.youtube_channel_id));

  // The size band candidates must land in, anchored on the median tracked
  // channel so one giant in the list doesn't drag suggestions upmarket.
  const refSubs =
    median((tracked ?? []).map((c) => c.subscriber_count ?? 0).filter((n) => n > 0)) ??
    DEFAULT_REF_SUBS;
  const bandMin = Math.max(MIN_SUBS, refSubs / BAND_SPAN);
  const bandMax = refSubs * BAND_SPAN;
  const inBand = (subs: number, videos: number) =>
    subs >= bandMin && subs <= bandMax && videos >= MIN_VIDEOS;
  const logDist = (subs: number) => Math.abs(Math.log10(subs) - Math.log10(refSubs));

  const catSubs = new Map<string, number>();
  for (const c of tracked ?? []) {
    if (c.category) catSubs.set(c.category, (catSubs.get(c.category) ?? 0) + 1);
  }
  const trackedCategories = Array.from(catSubs.keys());

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
    const subs = p.subscriber_count ?? 0;
    if (!inBand(subs, p.video_count ?? 0)) continue;
    seen.add(p.youtube_channel_id);
    ranked.push({
      prox: logDist(subs),
      s: {
        channelId: p.youtube_channel_id,
        name: p.channel_name,
        handle: p.channel_handle,
        thumbnail: p.thumbnail_url,
        subscriberCount: subs,
        videoCount: p.video_count ?? 0,
        medianViews: p.median_views,
        category: p.category,
        // Say WHY it's here — a suggestion without a reason reads as an ad.
        reason: p.category
          ? `Match: ${categoryLabel(p.category)} · ${fmtSubs(subs)} subs, your tier`
          : `Match: ${fmtSubs(subs)} subs, your tier`,
        source: "pool",
      },
    });
  }
  // Nearest in size on a log scale — a 40K list should see 15K–300K peers,
  // not whoever in the pool happens to be biggest.
  ranked.sort((a, b) => a.prox - b.prox);
  const suggestions: Suggestion[] = ranked.slice(0, SHELF_SIZE).map((r) => r.s);

  // Thin pool → top up live from YouTube, seeded by the user's tracked
  // channels' top outlier title (their niche, stated in its own words). The
  // old fallback searched "<category> youtube channel", which for the default
  // "other" category literally queried "Other youtube channel" and filled the
  // shelf with junk.
  if (suggestions.length < POOL_MIN_BEFORE_FALLBACK && (tracked ?? []).length > 0) {
    try {
      const { data: topVideo } = await supabase
        .from("competitor_videos")
        .select("title")
        .in("competitor_channel_id", (tracked ?? []).map((c) => c.id))
        .order("outlier_score", { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

      const topCat = trackedCategories.sort((a, b) => (catSubs.get(b) ?? 0) - (catSubs.get(a) ?? 0))[0];
      const candidates = topVideo?.title
        ? await searchNicheChannels(topVideo.title)
        : topCat && topCat !== "other"
          ? await searchChannels(`${categoryLabel(topCat)} youtube channel`, SHELF_SIZE * 2)
          : [];

      const ytRanked = candidates
        .map((ch) => ({
          id: ch.id ?? "",
          name: ch.snippet?.title ?? "",
          handle: ch.snippet?.customUrl ?? null,
          thumbnail: ch.snippet?.thumbnails?.medium?.url ?? null,
          subs: parseInt(ch.statistics?.subscriberCount ?? "0"),
          videos: parseInt(ch.statistics?.videoCount ?? "0"),
        }))
        .filter((c) => c.id && !trackedIds.has(c.id) && !seen.has(c.id) && inBand(c.subs, c.videos))
        .sort((a, b) => logDist(a.subs) - logDist(b.subs));

      for (const c of ytRanked) {
        if (suggestions.length >= SHELF_SIZE) break;
        seen.add(c.id);
        suggestions.push({
          channelId: c.id,
          name: c.name,
          handle: c.handle,
          thumbnail: c.thumbnail,
          subscriberCount: c.subs,
          videoCount: c.videos,
          medianViews: null,
          category: topCat ?? null,
          reason: `Match: ranks for your niche's breakout topics · ${fmtSubs(c.subs)} subs`,
          source: "youtube",
        });
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
