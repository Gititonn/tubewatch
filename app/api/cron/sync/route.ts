import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: channels, error } = await supabase
    .from("channels")
    .select("id, youtube_channel_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { origin } = new URL(request.url);
  const results = await Promise.allSettled(
    (channels ?? []).map((ch) =>
      fetch(`${origin}/api/youtube/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelDbId: ch.id,
          youtubeChannelId: ch.youtube_channel_id,
        }),
      })
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ synced: succeeded, total: channels?.length ?? 0 });
}
