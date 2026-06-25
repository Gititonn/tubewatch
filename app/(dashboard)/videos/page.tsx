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
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Videos</h1>

      {!channel && (
        <p style={{ color: "#888" }}>
          <Link href="/connect" className="underline" style={{ color: "#00ff87" }}>Connect a channel</Link> to see your videos.
        </p>
      )}

      {videos && videos.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#2a2a2a" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2a2a", background: "#1a1a1a" }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "#888" }}>Video</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "#888" }}>Views</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "#888" }}>Likes</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "#888" }}>Duration</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "#888" }}>Published</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid #1a1a1a" }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 flex items-center gap-3">
                    {v.thumbnail_url && (
                      <Image src={v.thumbnail_url} alt={v.title ?? ""} width={64} height={36} className="rounded object-cover flex-shrink-0" />
                    )}
                    <span className="text-white line-clamp-2 max-w-xs">{v.title}</span>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: "#ccc" }}>{v.view_count?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "#ccc" }}>{v.like_count?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "#888" }}>{formatDuration(v.duration_seconds)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "#888" }}>
                    {v.published_at ? new Date(v.published_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
