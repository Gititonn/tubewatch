import { google } from "googleapis";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

/**
 * Typed error for all YouTube Data API failures. Previously every call in
 * this file was unwrapped — a quota-exceeded 403 or a transient 5xx blew up
 * as a raw, uncaught exception, which Next.js turns into a generic 500 with
 * no useful message (e.g. the /connect route, a first-run-critical flow,
 * had zero error handling around getChannelByHandle at all).
 */
export type YouTubeErrorReason = "quota_exceeded" | "not_found" | "transient" | "unknown";

export class YouTubeApiError extends Error {
  reason: YouTubeErrorReason;
  status: number;

  constructor(reason: YouTubeErrorReason, status: number, message: string) {
    super(message);
    this.name = "YouTubeApiError";
    this.reason = reason;
    this.status = status;
  }
}

function classifyError(err: unknown): YouTubeApiError {
  const anyErr = err as {
    code?: number;
    status?: number;
    errors?: { reason?: string }[];
    message?: string;
  };
  const status = anyErr?.code ?? anyErr?.status ?? 0;
  const apiReason = anyErr?.errors?.[0]?.reason ?? "";

  if (status === 403 && /quota|rateLimit|dailyLimit/i.test(apiReason)) {
    return new YouTubeApiError(
      "quota_exceeded",
      403,
      "YouTube API quota exceeded for today. Data will refresh once it resets."
    );
  }
  if (status === 404) {
    return new YouTubeApiError("not_found", 404, "Channel or video not found on YouTube.");
  }
  if (status === 0 || status >= 500) {
    return new YouTubeApiError(
      "transient",
      status || 503,
      "YouTube API is temporarily unavailable. Please try again."
    );
  }
  return new YouTubeApiError(
    "unknown",
    status || 500,
    anyErr?.message ?? "Unexpected error calling the YouTube API."
  );
}

/**
 * Retries only genuinely transient failures (network errors, 5xx) with
 * exponential backoff + jitter. Quota-exceeded and not-found fail fast —
 * retrying those just burns more quota or time for a guaranteed repeat
 * failure. Exported so routes that call googleapis directly (e.g. trending,
 * which uses chart:"mostPopular" with no lib/youtube.ts wrapper) can reuse
 * the same resilience instead of duplicating it.
 */
export async function withYouTubeRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: YouTubeApiError | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const classified = classifyError(err);
      lastError = classified;
      if (classified.reason !== "transient" || attempt === retries) {
        throw classified;
      }
      const backoffMs = 300 * 2 ** attempt + Math.random() * 150;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  // Unreachable, but keeps TypeScript happy.
  throw lastError ?? new YouTubeApiError("unknown", 500, "Unexpected error calling the YouTube API.");
}

export async function getChannelByHandle(handle: string) {
  const clean = handle.replace(/^@/, "").replace(/^https?:\/\/.*\/@?/, "");

  // Try forHandle first
  const res = await withYouTubeRetry(() =>
    youtube.channels.list({
      part: ["snippet", "statistics"],
      forHandle: clean,
    })
  );

  if (res.data.items && res.data.items.length > 0) {
    return res.data.items[0];
  }

  // Fallback: try forUsername
  const res2 = await withYouTubeRetry(() =>
    youtube.channels.list({
      part: ["snippet", "statistics"],
      forUsername: clean,
    })
  );

  return res2.data.items?.[0] ?? null;
}

export async function getChannelVideos(channelId: string, maxResults = 50) {
  // Get uploads playlist ID
  const channelRes = await withYouTubeRetry(() =>
    youtube.channels.list({
      part: ["contentDetails"],
      id: [channelId],
    })
  );

  const uploadsPlaylistId =
    channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) return [];

  // Get playlist items
  const playlistRes = await withYouTubeRetry(() =>
    youtube.playlistItems.list({
      part: ["contentDetails"],
      playlistId: uploadsPlaylistId,
      maxResults,
    })
  );

  const videoIds = playlistRes.data.items
    ?.map((item) => item.contentDetails?.videoId)
    .filter(Boolean) as string[];

  if (!videoIds || videoIds.length === 0) return [];

  // Batch fetch video stats
  const videosRes = await withYouTubeRetry(() =>
    youtube.videos.list({
      part: ["snippet", "statistics", "contentDetails"],
      id: videoIds,
    })
  );

  return videosRes.data.items ?? [];
}

/** Fetch a single channel's snippet + statistics by channel id. */
export async function getChannelById(channelId: string) {
  const res = await withYouTubeRetry(() =>
    youtube.channels.list({ part: ["snippet", "statistics"], id: [channelId] })
  );
  return res.data.items?.[0] ?? null;
}

/**
 * Fetch stats for arbitrary videos by id (batched ≤50 per call). Powers the
 * browser-extension / search-any-channel on-demand scoring path, where the
 * video ids come from whatever the user is browsing rather than a channel.
 */
export async function getVideosByIds(ids: string[]) {
  const out: Awaited<ReturnType<typeof getChannelVideos>> = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    if (batch.length === 0) continue;
    const res = await withYouTubeRetry(() =>
      youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails"],
        id: batch,
      })
    );
    if (res.data.items) out.push(...res.data.items);
  }
  return out;
}

/**
 * Channel-name search (used by the "search YouTube directly" fallback when
 * a topic search comes up empty against already-synced outliers). Previously
 * lived duplicated in app/api/competitors/search/route.ts with its own
 * unwrapped googleapis client and zero error handling — consolidated here
 * so it gets the same retry/backoff + typed-error treatment as everything
 * else, and the route no longer needs to construct its own client.
 */
export async function searchChannels(query: string, maxResults = 5) {
  const searchRes = await withYouTubeRetry(() =>
    youtube.search.list({
      part: ["snippet"],
      type: ["channel"],
      q: query,
      maxResults,
    })
  );

  const channelIds = searchRes.data.items
    ?.map((item) => item.id?.channelId)
    .filter(Boolean) as string[];

  if (!channelIds || channelIds.length === 0) return [];

  const channelsRes = await withYouTubeRetry(() =>
    youtube.channels.list({
      part: ["snippet", "statistics"],
      id: channelIds,
    })
  );

  return channelsRes.data.items ?? [];
}

export function parseDurationToSeconds(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}
