import { createServiceClient } from "@/lib/supabase/server";
import { searchNicheChannels } from "@/lib/youtube";
import { createCompetitorSyncCache, syncCompetitorChannel } from "@/lib/sync";
import { planLimits } from "@/lib/entitlements";
import type { Plan } from "@/lib/plan";

/**
 * First-run competitor auto-suggest.
 *
 * A new user can't name their competitors — that's half of why they signed
 * up — so an empty "add your first competitor" state after connect means
 * doing homework before seeing any value, and they don't come back. Instead:
 * seed a niche query from their top-viewed video title, pull channels YouTube
 * itself ranks for that topic, keep the ones nearest the user's size, track
 * them, and sync them NOW so the outlier radar has real rows on first load.
 *
 * Best-effort by design: any failure (quota, no videos yet, thin search
 * results) leaves the user exactly where they were before this existed.
 * Suggestions only run when the user tracks zero competitors — it never
 * touches a list the user has curated.
 */

// Candidates outside this band aren't peers: below, their outliers are noise
// (a 90-view channel's 4x means nothing); above, you're "competing" with
// studios whose breakouts say nothing about what a small channel can capture.
const MIN_SUBS = 1_000;
const MAX_SUBS = 500_000;
const SUGGESTIONS = 3;

export async function autoSuggestCompetitors(params: {
  userId: string;
  channelDbId: string;
  youtubeChannelId: string;
  subscriberCount: number | null;
  plan: Plan;
}): Promise<{ suggested: number }> {
  const { userId, channelDbId, youtubeChannelId, subscriberCount, plan } = params;
  const svc = createServiceClient();

  const { count } = await svc
    .from("competitor_channels")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) > 0) return { suggested: 0 };

  // The user's top-viewed video title is the strongest public "my niche"
  // signal we have. No synced videos yet → nothing sensible to search for.
  const { data: topVideo } = await svc
    .from("videos")
    .select("title")
    .eq("channel_id", channelDbId)
    .order("view_count", { ascending: false })
    .limit(1)
    .single();
  if (!topVideo?.title) return { suggested: 0 };

  const candidates = await searchNicheChannels(topVideo.title, youtubeChannelId);

  const ownSubs = subscriberCount && subscriberCount > 0 ? subscriberCount : 10_000;
  const ranked = candidates
    .map((ch) => ({
      id: ch.id!,
      name: ch.snippet?.title ?? "Unknown channel",
      handle: ch.snippet?.customUrl ?? null,
      thumbnail: ch.snippet?.thumbnails?.default?.url ?? null,
      subs: parseInt(ch.statistics?.subscriberCount ?? "0"),
      videoCount: parseInt(ch.statistics?.videoCount ?? "0"),
    }))
    .filter((c) => c.id && c.subs >= MIN_SUBS && c.subs <= MAX_SUBS && c.videoCount >= 5)
    // Nearest in size on a log scale — 4K subs is a peer of 8K, not of 400K.
    .sort(
      (a, b) =>
        Math.abs(Math.log10(a.subs) - Math.log10(ownSubs)) -
        Math.abs(Math.log10(b.subs) - Math.log10(ownSubs))
    )
    .slice(0, Math.min(SUGGESTIONS, planLimits(plan).competitorLimit));

  if (ranked.length === 0) return { suggested: 0 };

  const { data: inserted, error } = await svc
    .from("competitor_channels")
    .upsert(
      ranked.map((c) => ({
        user_id: userId,
        youtube_channel_id: c.id,
        channel_name: c.name,
        channel_handle: c.handle,
        thumbnail_url: c.thumbnail,
        subscriber_count: c.subs,
        video_count: c.videoCount,
        category: "other",
      })),
      { onConflict: "user_id,youtube_channel_id" }
    )
    .select("id, youtube_channel_id");
  if (error || !inserted) return { suggested: 0 };

  // Sync now, not on the next cron: the whole point is scored competitor
  // outliers on the user's FIRST dashboard load, not tomorrow's.
  const cache = createCompetitorSyncCache();
  await Promise.allSettled(
    inserted.map((row) => syncCompetitorChannel(row.id, row.youtube_channel_id, cache))
  );

  return { suggested: inserted.length };
}
