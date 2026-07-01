/**
 * Honest comparison vs Viewstats, kept intentionally generic/structural
 * rather than tied to one specific real channel: Viewstats gates untracked
 * channels behind a manual "submitted for tracking" review with no
 * guarantee/timeline, while TubeWatch syncs any channel instantly via the
 * YouTube Data API. That mechanism difference is durable; a specific "we
 * tried @handle and it worked" claim is not — the exact channel could get
 * added to Viewstats' database at any time and invalidate the anecdote.
 * Recreated as a styled mockup rather than a real screenshot of Viewstats'
 * UI — keeps the claim honest without reproducing their actual
 * product/branding.
 */
export default function ComparisonSection() {
  return (
    <section className="px-4 pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">
            Most tools don&apos;t even know your channel exists yet.
          </h2>
          <p style={{ color: "#888" }}>
            Search a small channel that isn&apos;t already tracked. This is the difference.
          </p>
        </div>

        <div className="grid gap-4 md:gap-0 md:grid-cols-[1fr_auto_1fr] items-center">
          {/* Other tools */}
          <div
            className="rounded-2xl border p-6"
            style={{ borderColor: "#2a2a2a", background: "#111" }}
          >
            <p className="text-xs font-bold mb-4 uppercase tracking-wide" style={{ color: "#666" }}>
              Other tools (e.g. Viewstats)
            </p>
            <div
              className="rounded-xl p-5 flex flex-col items-center text-center gap-2"
              style={{ background: "#0a0a0a", border: "1px solid #222" }}
            >
              <div className="text-3xl mb-1">🔒</div>
              <p className="text-sm font-bold text-white">&quot;Submitted for tracking&quot;</p>
              <p className="text-xs leading-relaxed" style={{ color: "#666" }}>
                If the channel exists, it may be added to the database. In the meantime,
                check out one of the creators below.
              </p>
              <span
                className="mt-2 text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: "#ffffff10", color: "#888" }}
              >
                No timeline · no guarantee
              </span>
            </div>
          </div>

          {/* VS divider */}
          <div className="flex md:flex-col items-center justify-center gap-2 py-2 md:py-0 md:px-6">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555" }}
            >
              VS
            </div>
          </div>

          {/* TubeWatch */}
          <div
            className="rounded-2xl border p-6"
            style={{ borderColor: "#00ff87", background: "#0a1a0f", boxShadow: "0 0 40px rgba(0,255,135,0.1)" }}
          >
            <p className="text-xs font-bold mb-4 uppercase tracking-wide" style={{ color: "#00ff87" }}>
              TubeWatch
            </p>
            <div
              className="rounded-xl p-5 flex flex-col gap-2.5"
              style={{ background: "#0a0a0a", border: "1px solid rgba(0,255,135,0.2)" }}
            >
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span style={{ color: "#00ff87" }}>✓</span> Channel connected
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span style={{ color: "#00ff87" }}>✓</span> Videos synced
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span style={{ color: "#00ff87" }}>✓</span> Outlier scores live
              </div>
              <span
                className="mt-2 text-[11px] font-bold px-2.5 py-1 rounded-full inline-block w-fit"
                style={{ background: "rgba(0,255,135,0.15)", color: "#00ff87" }}
              >
                Under a minute · any channel size
              </span>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-sm" style={{ color: "#555" }}>
          No waitlist. No &quot;does your channel qualify&quot; review. Any channel, any size, synced instantly
          via the YouTube Data API.
        </p>
      </div>
    </section>
  );
}
