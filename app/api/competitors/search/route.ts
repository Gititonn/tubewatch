import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const searchRes = await youtube.search.list({
    part: ["snippet"],
    type: ["channel"],
    q,
    maxResults: 5,
  });

  const channelIds = searchRes.data.items
    ?.map((item) => item.id?.channelId)
    .filter(Boolean) as string[];

  if (!channelIds || channelIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const channelsRes = await youtube.channels.list({
    part: ["snippet", "statistics"],
    id: channelIds,
  });

  const results = channelsRes.data.items?.map((ch) => ({
    channelId: ch.id,
    name: ch.snippet?.title,
    handle: ch.snippet?.customUrl ?? null,
    thumbnail: ch.snippet?.thumbnails?.medium?.url ?? null,
    subscriberCount: parseInt(ch.statistics?.subscriberCount ?? "0"),
    videoCount: parseInt(ch.statistics?.videoCount ?? "0"),
  })) ?? [];

  return NextResponse.json({ results });
}
