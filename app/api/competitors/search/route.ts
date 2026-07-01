import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchChannels, YouTubeApiError } from "@/lib/youtube";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  let channels;
  try {
    channels = await searchChannels(q, 5);
  } catch (err) {
    if (err instanceof YouTubeApiError) {
      return NextResponse.json({ error: err.message }, { status: err.reason === "quota_exceeded" ? 503 : err.status });
    }
    return NextResponse.json({ error: "Couldn't reach YouTube. Please try again." }, { status: 503 });
  }

  const results = channels.map((ch) => ({
    channelId: ch.id,
    name: ch.snippet?.title,
    handle: ch.snippet?.customUrl ?? null,
    thumbnail: ch.snippet?.thumbnails?.medium?.url ?? null,
    subscriberCount: parseInt(ch.statistics?.subscriberCount ?? "0"),
    videoCount: parseInt(ch.statistics?.videoCount ?? "0"),
  }));

  return NextResponse.json({ results });
}
