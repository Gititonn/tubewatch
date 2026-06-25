import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import ResyncButton from "./ResyncButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .eq("user_id", user!.id)
    .limit(1);

  const channel = channels?.[0];

  const stats: { totalVideos: number; avgViews: number; bestVideo: Record<string, unknown> | null } = { totalVideos: 0, avgViews: 0, bestVideo: null };

  if (channel) {
    const { data: videos } = await supabase
      .from("videos")
      .select("*")
      .eq("channel_id", channel.id);

    if (videos && videos.length > 0) {
      stats.totalVideos = videos.length;
      stats.avgViews = Math.round(
        videos.reduce((s, v) => s + (v.view_count ?? 0), 0) / videos.length
      );
      stats.bestVideo = videos.sort((a, b) => b.view_count - a.view_count)[0];
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {!channel ? (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
        >
          <div className="text-4xl mb-4">📺</div>
          <h2 className="text-lg font-semibold text-white mb-2">Connect your YouTube channel</h2>
          <p className="text-sm mb-6" style={{ color: "#888" }}>
            Add your channel to start tracking your video performance.
          </p>
          <Link
            href="/connect"
            className="inline-block px-6 py-2.5 rounded-lg font-semibold text-black text-sm transition-opacity hover:opacity-90"
            style={{ background: "#00ff87" }}
          >
            Connect channel
          </Link>
        </div>
      ) : (
        <>
          <div
            className="rounded-xl border p-5 flex items-center gap-4 mb-6"
            style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
          >
            {channel.channel_thumbnail && (
              <Image
                src={channel.channel_thumbnail}
                alt={channel.channel_name ?? "Channel"}
                width={56}
                height={56}
                className="rounded-full"
              />
            )}
            <div>
              <div className="font-semibold text-white">{channel.channel_name}</div>
              <div className="text-sm" style={{ color: "#888" }}>
                {channel.subscriber_count?.toLocaleString()} subscribers
              </div>
            </div>
            <ResyncButton
              channelDbId={channel.id}
              youtubeChannelId={channel.youtube_channel_id}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total videos" value={stats.totalVideos.toLocaleString()} />
            <StatCard label="Avg views" value={stats.avgViews.toLocaleString()} />
            <StatCard
              label="Best video"
              value={stats.bestVideo ? String(stats.bestVideo.view_count) + " views" : "—"}
              sub={stats.bestVideo ? String(stats.bestVideo.title ?? "") : ""}
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
    >
      <div className="text-sm mb-1" style={{ color: "#888" }}>{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && (
        <div className="text-xs mt-1 truncate" style={{ color: "#555" }}>{sub}</div>
      )}
    </div>
  );
}
