/**
 * The differentiator, stated as math instead of adjectives. Most outlier
 * tools score views ÷ channel median views — which crowns old back-catalog
 * hits and buries genuinely breaking videos for months. Our score is
 * age-adjusted velocity. This section exists because the one defensible
 * claim on the page was previously invisible on it.
 */

const rows = [
  {
    video: "3-year-old hit",
    views: "500K views",
    age: "1,100 days",
    raw: { score: "12.5x", verdict: "“outlier” 🏆", good: false },
    ours: { score: "1.1x", verdict: "typical for this channel", good: false },
  },
  {
    video: "Posted 5 days ago",
    views: "40K views",
    age: "5 days",
    raw: { score: "1.0x", verdict: "invisible for months", good: false },
    ours: { score: "13.3x", verdict: "breaking out now 🔥", good: true },
  },
];

export default function ScoreMathSection() {
  return (
    <section className="px-4 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">
            Raw view counts lie. We divide by time.
          </h2>
          <p className="max-w-2xl mx-auto" style={{ color: "#888" }}>
            Most tools score a video as <span className="font-mono" style={{ color: "#ccc" }}>views ÷ channel median</span> —
            so their “outliers” are just old videos that had years to collect views, and a genuine
            breakout stays invisible until long after the moment to act on it. TubeWatch scores{" "}
            <span className="font-mono" style={{ color: "#00ff87" }}>views-per-day vs. that channel&apos;s median views-per-day</span>,
            with Shorts and long-form measured against their own baselines.
          </p>
        </div>

        <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "#2a2a2a", background: "#111" }}>
          <table className="w-full text-sm" style={{ minWidth: 560 }}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "#666" }}>
                <th className="p-4">Same channel, two videos</th>
                <th className="p-4">Raw views ÷ median<br /><span className="normal-case font-normal">(other tools)</span></th>
                <th className="p-4" style={{ color: "#00ff87" }}>Age-adjusted velocity<br /><span className="normal-case font-normal">(TubeWatch)</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.video} className="border-t" style={{ borderColor: "#1f1f1f" }}>
                  <td className="p-4">
                    <p className="font-bold text-white">{r.video}</p>
                    <p className="text-xs" style={{ color: "#666" }}>{r.views} · {r.age} old</p>
                  </td>
                  <td className="p-4">
                    <p className="font-mono font-bold" style={{ color: "#888" }}>{r.raw.score}</p>
                    <p className="text-xs" style={{ color: "#666" }}>{r.raw.verdict}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-mono font-bold" style={{ color: r.ours.good ? "#00ff87" : "#ccc" }}>{r.ours.score}</p>
                    <p className="text-xs" style={{ color: r.ours.good ? "#00ff87" : "#666" }}>{r.ours.verdict}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center mt-6 text-sm max-w-2xl mx-auto" style={{ color: "#555" }}>
          On top of that, daily view snapshots track what each video gained in the last 48 hours —
          so a quiet video that suddenly starts moving shows up while it&apos;s moving,
          not after the fact.
        </p>
      </div>
    </section>
  );
}
