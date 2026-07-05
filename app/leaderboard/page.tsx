import Link from "next/link";
import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/categories";

// Public, no-login page — pulls only from the shared discovery pool
// (competitor_channels.is_discovery = true), never user-owned data. Uses the
// service-role client because the discovery SELECT RLS policy is scoped to
// `authenticated` only; visitors here aren't logged in. Every query below is
// hard-filtered to is_discovery = true, so no user-scoped rows can leak.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Niche Leaderboards — TubeWatch",
  description: "See which channels and videos are quietly outperforming in your niche, updated hourly from real YouTube data.",
};

export default async function LeaderboardIndex() {
  const supabase = createServiceClient();

  const { data: channels } = await supabase
    .from("competitor_channels")
    .select("id, category, subscriber_count")
    .eq("is_discovery", true);

  const rows = channels ?? [];
  const statsByCategory: Record<string, { channelCount: number; totalSubs: number }> = {};
  for (const c of rows) {
    const cat = c.category ?? "other";
    const s = statsByCategory[cat] ?? { channelCount: 0, totalSubs: 0 };
    s.channelCount += 1;
    s.totalSubs += c.subscriber_count ?? 0;
    statsByCategory[cat] = s;
  }

  const allIds = rows.map((c) => c.id);
  const topScoreByCategory: Record<string, number> = {};
  if (allIds.length > 0) {
    const { data: videos } = await supabase
      .from("competitor_videos")
      .select("outlier_score, competitor_channel_id")
      .in("competitor_channel_id", allIds)
      .not("outlier_score", "is", null)
      .order("outlier_score", { ascending: false })
      .limit(1000);

    const channelToCategory = Object.fromEntries(rows.map((c) => [c.id, c.category ?? "other"]));
    for (const v of videos ?? []) {
      const cat = channelToCategory[v.competitor_channel_id as string];
      if (!cat) continue;
      if (!topScoreByCategory[cat] || (v.outlier_score ?? 0) > topScoreByCategory[cat]) {
        topScoreByCategory[cat] = v.outlier_score ?? 0;
      }
    }
  }

  const populatedCategories = CATEGORIES.filter((c) => (statsByCategory[c.id]?.channelCount ?? 0) > 0);

  return (
    <main className="min-h-screen" style={{ background: "#0f0f0f" }}>
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-black text-white">
          Tube<span style={{ color: "#00ff87" }}>Watch</span>
        </Link>
        <Link
          href="/signup"
          className="px-5 py-2 rounded-lg font-bold text-black text-sm transition-transform hover:scale-105"
          style={{ background: "#00ff87" }}
        >
          Track your niche free →
        </Link>
      </header>

      <section className="px-6 pt-10 pb-14 max-w-6xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
          Niche <span style={{ color: "#00ff87" }}>Leaderboards</span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: "#888" }}>
          The videos quietly outperforming their channel&apos;s average, by niche — pulled from real,
          growing YouTube channels (not mega-creators). Updated as TubeWatch users track them.
        </p>
      </section>

      <section className="px-6 pb-24 max-w-6xl mx-auto">
        {populatedCategories.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{ borderColor: "#2a2a2a", background: "#111", color: "#666" }}
          >
            Leaderboards are warming up — check back soon.
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {populatedCategories.map((c) => {
              const stats = statsByCategory[c.id];
              const topScore = topScoreByCategory[c.id];
              return (
                <Link
                  key={c.id}
                  href={`/leaderboard/${c.id}`}
                  className="rounded-2xl border p-6 transition-all hover:-translate-y-1"
                  style={{ borderColor: "#2a2a2a", background: "#111" }}
                >
                  <div className="text-3xl mb-3">{c.emoji}</div>
                  <h2 className="text-lg font-bold text-white mb-1">{c.label}</h2>
                  <p className="text-sm mb-4" style={{ color: "#666" }}>
                    {/* One template string, not adjacent JSX text nodes — Next
                        separates those with HTML comments in the SSR output,
                        which text scrapers/SEO extractors read as stray spaces
                        ("2 channel s tracked"). */}
                    {`${stats.channelCount} channel${stats.channelCount === 1 ? "" : "s"} tracked`}
                  </p>
                  {topScore ? (
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: "rgba(0,255,135,0.1)", color: "#00ff87", border: "1px solid rgba(0,255,135,0.3)" }}
                    >
                      Top outlier: {topScore.toFixed(1)}x
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer
        className="flex items-center justify-center gap-6 py-8 px-4 border-t text-sm"
        style={{ borderColor: "#1a1a1a", color: "#666" }}
      >
        <span>© 2026 TubeWatch</span>
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <Link href="/signup" className="hover:text-white transition-colors">Sign up</Link>
      </footer>
    </main>
  );
}
