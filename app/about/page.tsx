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
        <p className="text-sm mb-8" style={{ color: "#666" }}>YouTube analytics built for creators who aren&apos;t famous yet.</p>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-white font-bold mb-2">Why we built this</h2>
            <p>
              Most YouTube analytics tools are built for channels that have already made it — millions of
              subscribers, a full-time editing team, a manager checking the numbers every morning. TubeWatch
              is built for everyone else: the 0–100K subscriber creator posting consistently, trying to figure
              out which of their videos actually worked and why, with a fraction of the time and budget.
            </p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">What TubeWatch does</h2>
            <p>
              TubeWatch scores every video against your own channel&apos;s median performance, so you can spot
              outliers — the videos that dramatically over- or under-performed — instead of just staring at raw
              view counts. From there it layers on competitor tracking, trending and rising-video feeds, title
              pattern analysis, and an AI coach that can explain why a specific video worked and suggest what to
              try next.
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
