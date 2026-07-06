"use client";

/**
 * Shared "click a video" experience for every outlier surface (full feed,
 * dashboard hero widget, and eventually rising/trending/patterns). Previously
 * every video card was a bare `<a href="youtube.com/watch..." target="_blank">`
 * — clicking anything on the card, including the title and stats TubeWatch
 * already had, threw the user straight onto YouTube with zero TubeWatch
 * context and no way to track the channel it came from. This modal keeps
 * them in-app: shows the full stat set, an explicit "Watch on YouTube" link
 * (still one click away, just no longer the *only* option), and a "Track
 * this channel" action so a promising discovery-pool video can turn into an
 * ongoing tracked competitor without leaving the page.
 */

export type ModalVideo = {
  title: string;
  thumbnail_url: string | null;
  youtube_video_id: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string | null;
  outlier_score: number | null;
};

export type ModalChannel = {
  id: string;
  channel_name: string;
  thumbnail_url: string | null;
  subscriber_count?: number | null;
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function VideoDetailModal({
  video,
  channel,
  isTracked,
  tracking,
  onTrack,
  onClose,
}: {
  video: ModalVideo;
  channel: ModalChannel;
  isTracked: boolean;
  tracking: boolean;
  onTrack: () => void;
  onClose: () => void;
}) {
  const score = video.outlier_score ?? 0;
  const ytUrl = `https://www.youtube.com/watch?v=${video.youtube_video_id}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl border overflow-hidden"
        style={{ maxWidth: 560, background: "var(--bg-card)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative" style={{ paddingBottom: "56.25%", background: "#000" }}>
          {video.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.thumbnail_url} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: "rgba(0,0,0,0.6)" }}
            aria-label="Close"
          >
            ✕
          </button>
          {score > 0 && (
            <div
              className="absolute top-2 left-2 px-2.5 py-1 rounded-md text-xs font-black"
              style={{ background: "rgba(0,0,0,0.7)", color: "#f97316" }}
            >
              🔥 {score.toFixed(1)}x outlier
            </div>
          )}
        </div>

        <div className="p-5">
          <h2 className="text-lg font-bold mb-3 leading-snug" style={{ color: "var(--text-primary)" }}>
            {video.title}
          </h2>

          <div className="flex items-center gap-2 mb-4">
            {channel.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={channel.thumbnail_url} alt={channel.channel_name} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--border)" }}>
                {channel.channel_name?.[0] ?? "?"}
              </div>
            )}
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{channel.channel_name}</span>
            {channel.subscriber_count != null && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {fmt(channel.subscriber_count)} subs</span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label: "Views", value: fmt(video.view_count) },
              { label: "Likes", value: fmt(video.like_count) },
              { label: "Comments", value: fmt(video.comment_count) },
              { label: "Published", value: fmtDate(video.published_at) },
            ].map((s) => (
              <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "var(--bg-hover, rgba(255,255,255,0.03))", border: "1px solid var(--border)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-2.5 rounded-xl font-bold text-sm transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Watch on YouTube ↗
            </a>
            {isTracked ? (
              <span
                className="flex-1 text-center py-2.5 rounded-xl font-bold text-sm"
                style={{ background: "rgba(0,255,135,0.1)", color: "#00ff87", border: "1px solid rgba(0,255,135,0.3)" }}
              >
                ✓ Tracking this channel
              </span>
            ) : (
              <button
                onClick={onTrack}
                disabled={tracking}
                className="flex-1 py-2.5 rounded-xl font-black text-sm text-black transition-transform hover:scale-[1.02] disabled:opacity-50"
                style={{ background: "#00ff87" }}
              >
                {tracking ? "Adding…" : "+ Track this channel"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
