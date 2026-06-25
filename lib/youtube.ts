import { google } from "googleapis";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

export async function getChannelByHandle(handle: string) {
  const clean = handle.replace(/^@/, "").replace(/^https?:\/\/.*\/@?/, "");

  // Try forHandle first
  const res = await youtube.channels.list({
    part: ["snippet", "statistics"],
    forHandle: clean,
  });

  if (res.data.items && res.data.items.length > 0) {
    return res.data.items[0];
  }

  // Fallback: try forUsername
  const res2 = await youtube.channels.list({
    part: ["snippet", "statistics"],
    forUsername: clean,
  });

  return res2.data.items?.[0] ?? null;
}

export async function getChannelVideos(channelId: string, maxResults = 50) {
  // Get uploads playlist ID
  const channelRes = await youtube.channels.list({
    part: ["contentDetails"],
    id: [channelId],
  });

  const uploadsPlaylistId =
    channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) return [];

  // Get playlist items
  const playlistRes = await youtube.playlistItems.list({
    part: ["contentDetails"],
    playlistId: uploadsPlaylistId,
    maxResults,
  });

  const videoIds = playlistRes.data.items
    ?.map((item) => item.contentDetails?.videoId)
    .filter(Boolean) as string[];

  if (!videoIds || videoIds.length === 0) return [];

  // Batch fetch video stats
  const videosRes = await youtube.videos.list({
    part: ["snippet", "statistics", "contentDetails"],
    id: videoIds,
  });

  return videosRes.data.items ?? [];
}

export function parseDurationToSeconds(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}
