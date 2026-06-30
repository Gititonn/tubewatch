import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/outlier";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: channels } = await supabase
    .from("channels")
    .select("id")
    .eq("user_id", user!.id)
    .limit(1);

  const channel = channels?.[0];

  const { data: videos } = channel
    ? await supabase
        .from("videos")
        .select("*")
        .eq("channel_id", channel.id)
        .order("published_at", { ascending: false })
    : { data: [] };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Videos</h1>

      {!channel && (
        <p style={{ color: "var(--text-secondary)" }}>
          <Link href="/connect" className="underline" style={{ color: "var(--accent)" }}>Connect a channel</Link> to see your videos.
        </p>
      )}

      {videos && videos.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="overflow-x-auto">
          <table className="min-w-[560px] w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Video</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Views</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Likes</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Duration</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Published</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 flex items-center gap-3">
                    {v.thumbnail_url && (
                      <Image src={v.thumbnail_url} alt={v.title ?? ""} width={64} height={36} className="rounded object-cover flex-shrink-0" />
                    )}
                    <span className="text-foreground line-clamp-2 max-w-xs">{v.title}</span>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{v.view_count?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{v.like_count?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{formatDuration(v.duration_seconds)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>
                    {v.published_at ? new Date(v.published_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
