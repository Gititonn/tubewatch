import Link from "next/link";

export const metadata = {
  title: "About · TubeWatch",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen px-4 py-16" style={{ background: "#0f0f0f", color: "#ccc" }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm hover:underline" style={{ color: "#00ff87" }}>← TubeWatch</Link>
        <h1 className="text-3xl font-black text-white mt-6 mb-2">About TubeWatch</h1>
        <p className="text-sm mb-8" style={{ color: "#666" }}>Find the breakout videos in your niche before you make your next one.</p>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-white font-bold mb-2">Why we built this</h2>
            <p>
              Most YouTube analytics tools are built for channels that have already made it — millions of
              subscribers, a full-time editing team, a manager checking the numbers every morning. TubeWatch
              is built for the growing creator (roughly 1K–100K subs) who&apos;s serious about the channel and
              needs one thing above all: to know what to make next. So we start with the videos already
              winning in your niche — not just your own back-catalog.
            </p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">What TubeWatch does</h2>
            <p>
              TubeWatch tracks the competitors in your niche and surfaces their outliers — the videos pulling
              views far faster than the channel&apos;s norm — so you can see what&apos;s working before everyone else
              copies it. It scores videos on an age-adjusted velocity basis (views-per-day vs. the channel
              median), not raw totals, so fresh breakouts show up early instead of months late. From there it
              layers on rising and trending feeds, title pattern analysis, and an AI coach that
              reverse-engineers why a video worked — the hook, the packaging, the timing — so you can
              adapt the pattern for your own channel.
            </p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Who it&apos;s for</h2>
            <p>
              Small and mid-sized creators who want the kind of data-driven feedback loop that bigger channels
              take for granted — without the price tag or complexity built for agencies and networks.
            </p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Where we are</h2>
            <p>
              TubeWatch is in beta and actively evolving based on feedback from the creators using it. If
              something feels off or missing, the feedback button in the app goes straight to us.
            </p>
          </div>
        </section>

        <p className="mt-10 text-sm flex gap-4">
          <Link href="/terms" className="hover:underline" style={{ color: "#00ff87" }}>Terms of Service →</Link>
          <Link href="/privacy" className="hover:underline" style={{ color: "#00ff87" }}>Privacy Policy →</Link>
        </p>
      </div>
    </main>
  );
}
