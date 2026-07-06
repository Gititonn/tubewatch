import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — how TubeWatch scoring, syncing, and AI credits work",
  description:
    "How the age-adjusted Outlier Score is calculated, why raw view counts mislead, how often competitor data syncs, and how AI Coach credits are counted.",
};

/**
 * The trust layer (per the visual-clarity review): inline tooltips define
 * metrics at the point of use; this page handles the deeper "can I trust the
 * math / what am I paying for" questions that block conversion. Every answer
 * here states what the system ACTUALLY does — if behavior changes, this page
 * must change with it.
 */

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "What exactly is an “Outlier Score,” and how is the math calculated?",
    a: (
      <>
        A video&apos;s Outlier Score is its <strong>views-per-day</strong> divided by the{" "}
        <strong>median views-per-day of that same channel</strong>. A 6x score means the video
        is pulling views six times faster than that channel&apos;s normal — regardless of whether
        the channel is huge or tiny. Details that keep the number honest: Shorts and long-form
        videos are scored against separate medians (Shorts routinely get 10–100x the views, so
        mixing them would poison both numbers), and videos younger than 3 days aren&apos;t scored
        at all — every upload gets an initial burst, and scoring it too early would just measure
        &quot;newness.&quot; Separately, a <strong>velocity</strong> reading tracks what a video
        gained in roughly the last 48 hours vs. that same median, which is how the Rising feed
        catches videos while they&apos;re actively taking off.
      </>
    ),
  },
  {
    q: "Why doesn't the raw view count matter?",
    a: (
      <>
        Because raw totals mostly measure <em>time</em>, not performance. A mediocre video from
        three years ago has had a thousand days to collect views; a genuine breakout posted last
        week hasn&apos;t. Tools that rank by raw views (or raw views ÷ median views) crown old
        back-catalog hits and keep a real breakout invisible for months — exactly backwards from
        what you need when deciding what to film next. Dividing by time and comparing each video
        to its own channel&apos;s pace is what lets a 40K-view video on a small channel correctly
        outrank a 2M-view video on a big one.
      </>
    ),
  },
  {
    q: "How often does competitor data sync?",
    a: (
      <>
        Every tracked channel — yours and your competitors&apos; — syncs automatically{" "}
        <strong>once a day</strong>. Growth-plan channels sync <strong>every 6 hours</strong>.
        You can also hit &quot;Sync Now&quot; on any tracked channel at any time, and connecting
        or adding a channel syncs it immediately, so you&apos;re never waiting a day to see first
        data. Velocity readings (&quot;pulling Nx right now&quot;) need at least ~20 hours of
        snapshot history for a video, so brand-new additions show outlier scores immediately and
        grow into velocity data by the next day.
      </>
    ),
  },
  {
    q: "How are AI Coach credits counted — and do they roll over?",
    a: (
      <>
        One credit = one AI answer (a &quot;why did this break out?&quot; teardown or an AI Coach
        question). Free includes <strong>5 per month</strong>, Pro <strong>300</strong>, Growth{" "}
        <strong>1,500</strong>. The counter resets at the start of each calendar month and unused
        credits don&apos;t roll over. You can always see your remaining balance — the ⚡ counter
        next to any AI button — and every AI button says it costs a credit before you click, so
        you&apos;ll never burn one by surprise.
      </>
    ),
  },
  {
    q: "What happens if I track a channel that hasn't posted in months?",
    a: (
      <>
        Nothing breaks — it just won&apos;t generate much signal. Its catalog still gets scored,
        and if one of its old videos suddenly starts pulling views again (it happens — search
        traffic, an algorithm re-push), the velocity tracking will catch the resurgence and
        surface it. But a dormant channel produces no new breakouts to learn from, so your
        tracking slots are usually better spent on channels posting weekly in your niche. Swap
        channels any time — removing one frees the slot instantly.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen px-4 py-16" style={{ background: "#0f0f0f" }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black text-white mb-3">Frequently asked questions</h1>
        <p className="mb-12" style={{ color: "#888" }}>
          The math, the sync schedule, and what your plan actually includes — in plain language.
        </p>

        <div className="flex flex-col gap-4">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="rounded-2xl border p-6 group"
              style={{ borderColor: "#2a2a2a", background: "#111" }}
            >
              <summary className="font-bold text-white cursor-pointer list-none flex items-center justify-between gap-4">
                {f.q}
                <span className="transition-transform group-open:rotate-45 text-xl flex-shrink-0" style={{ color: "#00ff87" }}>
                  +
                </span>
              </summary>
              <div className="mt-4 text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
                {f.a}
              </div>
            </details>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="mb-4" style={{ color: "#666" }}>
            Still unsure? Try it on a real channel first — no account needed.
          </p>
          <Link
            href="/channel"
            className="inline-block px-6 py-3 rounded-xl font-bold text-black transition-transform hover:scale-105"
            style={{ background: "#00ff87" }}
          >
            Score any channel free →
          </Link>
        </div>
      </div>
    </main>
  );
}
