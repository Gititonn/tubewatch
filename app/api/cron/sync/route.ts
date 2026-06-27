import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncChannel } from "@/lib/sync";

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

  // Call the shared sync function directly — no open HTTP endpoint, no cooldown
  // for the scheduled job.
  const results = await Promise.allSettled(
    (channels ?? []).map((ch) =>
      syncChannel(ch.id, ch.youtube_channel_id, { enforceCooldown: false })
    )
  );

  const succeeded = results.filter(
    (r) => r.status === "fulfilled" && "synced" in r.value
  ).length;
  return NextResponse.json({ synced: succeeded, total: channels?.length ?? 0 });
}
