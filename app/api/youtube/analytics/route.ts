import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleToken } from "@/lib/google-token";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "28"; // days
  const days = Math.min(parseInt(range), 365);

  const accessToken = await getGoogleToken(user.id);
  if (!accessToken) {
    return NextResponse.json({ error: "google_not_connected" }, { status: 403 });
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  url.searchParams.set("ids", "channel==MINE");
  url.searchParams.set("startDate", fmt(startDate));
  url.searchParams.set("endDate", fmt(endDate));
  url.searchParams.set("metrics", "views,subscribersGained,subscribersLost,estimatedMinutesWatched");
  url.searchParams.set("dimensions", "day");
  url.searchParams.set("sort", "day");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Analytics API error:", err);
    return NextResponse.json({ error: "analytics_api_error" }, { status: 500 });
  }

  const raw = await res.json();

  // Transform rows into [{date, views, subsGained, subsLost, watchMinutes}]
  const rows = (raw.rows ?? []).map((row: number[]) => ({
    date: row[0],
    views: row[1] ?? 0,
    subsGained: row[2] ?? 0,
    subsLost: row[3] ?? 0,
    watchMinutes: row[4] ?? 0,
    netSubs: (row[2] ?? 0) - (row[3] ?? 0),
  }));

  // Aggregate totals
  const totalViews = rows.reduce((s: number, r: { views: number }) => s + r.views, 0);
  const totalSubsGained = rows.reduce((s: number, r: { subsGained: number }) => s + r.subsGained, 0);
  const totalSubsLost = rows.reduce((s: number, r: { subsLost: number }) => s + r.subsLost, 0);
  const totalWatchHours = Math.round(
    rows.reduce((s: number, r: { watchMinutes: number }) => s + r.watchMinutes, 0) / 60
  );

  return NextResponse.json({
    range: days,
    rows,
    totals: {
      views: totalViews,
      subsGained: totalSubsGained,
      subsLost: totalSubsLost,
      netSubs: totalSubsGained - totalSubsLost,
      watchHours: totalWatchHours,
    },
  });
}
