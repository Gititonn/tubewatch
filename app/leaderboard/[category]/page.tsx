import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { CATEGORY_MAP, type ChannelCategory } from "@/lib/categories";

// Same public/no-login pattern as app/leaderboard/page.tsx — service-role
// client, every query hard-filtered to is_discovery = true.
export const revalidate = 3600;

function isValidCategory(id: string): id is ChannelCategory {
  return id in CATEGORY_MAP;
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  if (!isValidCategory(params.category)) return { title: "Niche Leaderboard — TubeWatch" };
  const cat = CATEGORY_MAP[params.category];
  return {
    title: `${cat.label} Outlier Leaderboard — TubeWatch`,
    description: `The videos quietly outperforming their channel's average in ${cat.label}, pulled from real growing YouTube channels.`,
  };
}

export default async function LeaderboardCategory({ params }: { params: { category: string } }) {
  if (!isValidCategory(params.category)) notFound();
  const cat = CATEGORY_MAP[params.category];

  const supabase = createServiceClient();

  const { data: channels } = await supabase
    .from("competitor_channels")
    .select("id, channel_name, channel_handle, thumbnail_url, subscriber_count, video_count, contributed_by")
    .eq("is_discovery", true)
    .eq("category", params.category)
    .order("subscriber_count", { ascending: false });

  const channelRows = channels ?? [];
  const channelIds = channelRows.map((c) => c.id);
  const channelById = Object.fromEntries(channelRows.map((c) => [c.id, c]));

  let videoRows: {
    title: string | null;
    thumbnail_url: string | null;
    view_count: number;
    outlier_score: number | null;
    published_at: string | null;
    competitor_channel_id: string;
  }[] = [];

  if (channelIds.length > 0) {
    const { data: videos } = await supabase
      .from("competitor_videos")
      .select("title, thumbnail_url, view_count, outlier_score, published_at, competitor_channel_id")
      .in("competitor_channel_id", channelIds)
      .not("outlier_score", "is", null)
      .order("outlier_score", { ascending: false })
      .limit(20);
    videoRows = videos ?? [];
  }

  if (channelRows.length === 0) {
    notFound();
  }

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

      <section className="px-6 pt-6 pb-10 max-w-6xl mx-auto">
        <Link href="/leaderboard" className="text-sm mb-4 inline-block hover:text-white transition-colors" style={{ color: "#666" }}>
          ← All niches
        </Link>
        <h1 className="text-4xl font-black text-white mb-2">
          {cat.emoji} {cat.label} <span style={{ color: "#00ff87" }}>Outliers</span>
        </h1>
        <p style={{ color: "#888" }}>
          Videos massively outperforming their own channel&apos;s average — the clearest signal of what&apos;s
          working right now in {cat.label.toLowerCase()}.
        </p>
      </section>

      <section className="px-6 pb-16 max-w-6xl mx-auto">
        <h2 className="text-lg font-bold text-white mb-4">Top outlier videos</h2>
        {videoRows.length === 0 ? (
          <div className="rounded-xl border p-8 text-center" style={{ borderColor: "#2a2a2a", background: "#111", color: "#666" }}>
            No scored outliers yet in this niche — check back soon.
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {videoRows.map((v, i) => {
              const ch = channelById[v.competitor_channel_id];
              return (
                <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: "#2a2a2a", background: "#111" }}>
                  <div className="relative" style={{ aspectRatio: "16/9", background: "#1a1a1a" }}>
                    {v.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnail_url} alt={v.title ?? ""} className="w-full h-full object-cover" />
                    ) : null}
                    <span
                      className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-black"
                      style={{ background: "rgba(0,0,0,0.75)", color: "#f97316" }}
                    >
                      🔥 {(v.outlier_score ?? 0).toFixed(1)}x
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-white text-sm font-semibold mb-1 line-clamp-2">{v.title}</p>
                    <p className="text-xs" style={{ color: "#666" }}>
                      {ch?.channel_name ?? "Unknown channel"} · {v.view_count.toLocaleString()} views
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <h2 className="text-lg font-bold text-white mb-4">Channels tracked in {cat.label}</h2>
        <div className="flex flex-col gap-2">
          {channelRows.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-lg px-4 py-3"
              style={{ background: "#111", border: "1px solid #2a2a2a" }}
            >
              {c.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.thumbnail_url} alt={c.channel_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold" style={{ background: "#2a2a2a" }}>
                  {(c.channel_name ?? "?")[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{c.channel_name}</p>
              </div>
              <p className="text-xs flex-shrink-0" style={{ color: "#666" }}>
                {(c.subscriber_count ?? 0).toLocaleString()} subs
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center pb-20 px-6">
        <p className="text-2xl font-black text-white mb-2">Want to track your own competitors like this?</p>
        <p className="mb-6" style={{ color: "#666" }}>Add any channel and see its outliers scored in seconds.</p>
        <Link
          href="/signup"
          className="inline-block px-10 py-3.5 rounded-xl font-black text-black text-lg transition-transform hover:scale-105"
          style={{ background: "#00ff87", boxShadow: "0 0 40px rgba(0,255,135,0.35)" }}
        >
          Get started free →
        </Link>
      </div>

      <footer
        className="flex items-center justify-center gap-6 py-8 px-4 border-t text-sm"
        style={{ borderColor: "#1a1a1a", color: "#666" }}
      >
        <span>© 2026 TubeWatch</span>
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <Link href="/leaderboard" className="hover:text-white transition-colors">All niches</Link>
      </footer>
    </main>
  );
}
