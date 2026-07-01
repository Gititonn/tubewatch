import Link from "next/link";
import { redirect } from "next/navigation";
import FeatureCarousel from "./feature-carousel";
import ComparisonSection from "./comparison-section";
import { PLANS, PRICING_FOOTNOTE } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

const cards = [
  { emoji: "📅", title: "I posted every day for 30 days", views: "847K views", duration: "12:08", badge: "🔥 Outlier", badgeColor: "#ff4444", bg: "#1a0a0a" },
  { emoji: "🖼️", title: "The thumbnail that changed everything", views: "1.2M views", duration: "8:47", badge: "🚀 Top video", badgeColor: "#00ff87", bg: "#0a1a0f" },
  { emoji: "💬", title: "Honest review: is it actually worth it?", views: "23K views", duration: "15:32", badge: "📊 Tracking", badgeColor: "#3b82f6", bg: "#0a0f1a" },
  { emoji: "📈", title: "How I grew 10K subs in 60 days", views: "312K views", duration: "10:21", badge: "⭐ Viral", badgeColor: "#8b5cf6", bg: "#120a1a" },
  { emoji: "🎤", title: "Q&A: your questions answered!", views: "18K views", duration: "22:54", badge: "😴 Below avg", badgeColor: "#666", bg: "#111" },
  { emoji: "🎬", title: "Behind the scenes of my studio setup", views: "445K views", duration: "6:13", badge: "🔥 Outlier", badgeColor: "#ff4444", bg: "#1a0a0a" },
  { emoji: "🎯", title: "The video formula that actually works", views: "671K views", duration: "9:05", badge: "🚀 Top video", badgeColor: "#00ff87", bg: "#0a1a0f" },
  { emoji: "🏆", title: "100K subscribers! How we got here", views: "89K views", duration: "14:39", badge: "⭐ Milestone", badgeColor: "#ffaa00", bg: "#1a150a" },
  { emoji: "🍕", title: "I only ate one food for a week", views: "2.1M views", duration: "18:02", badge: "🔥 Outlier", badgeColor: "#ff4444", bg: "#1a0a0a" },
  { emoji: "🎮", title: "Playing games I've never tried before", views: "156K views", duration: "27:46", badge: "📈 Growing", badgeColor: "#00ff87", bg: "#0a1a0f" },
];

const features = [
  { icon: "🔎", label: "Competitor Outlier Radar" },
  { icon: "🧠", label: "AI Next-Video Coach" },
  { icon: "📈", label: "Rising & Trending" },
  { icon: "🧩", label: "Niche Patterns" },
  { icon: "⚖️", label: "Channel Compare" },
  { icon: "⚡", label: "Instant Any-Channel Sync" },
];

function PlanFeatures({ features, color }: { features: string[]; color: string }) {
  return (
    <ul className="flex flex-col gap-3 mb-8 flex-1">
      {features.map((f) => {
        const soon = / \(coming soon\)$/i.test(f);
        const label = f.replace(/ \(coming soon\)$/i, "");
        return (
          <li key={f} className="flex items-center gap-2 text-sm" style={{ color: soon ? "#666" : color }}>
            <span style={{ color: soon ? "#666" : "#00ff87" }}>{soon ? "○" : "✓"}</span>
            <span>
              {label}
              {soon && (
                <span
                  className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle"
                  style={{ background: "#ffffff10", color: "#888", border: "1px solid #ffffff20" }}
                >
                  SOON
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const doubled = [...cards, ...cards];

  return (
    <>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 24px rgba(0,255,135,0.3); }
          50%       { box-shadow: 0 0 48px rgba(0,255,135,0.6); }
        }
        @keyframes badge-pop {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.08); }
        }
        .marquee-inner {
          display: flex;
          gap: 16px;
          width: max-content;
          animation: marquee 35s linear infinite;
        }
        .marquee-inner:hover { animation-play-state: paused; }
        .cta-primary { animation: glow-pulse 3s ease-in-out infinite; }
        .video-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .video-card:hover {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 12px 40px rgba(0,0,0,0.6);
        }
        .badge-hot { animation: badge-pop 2s ease-in-out infinite; }
      `}</style>

      <main className="min-h-screen flex flex-col" style={{ background: "#0f0f0f", overflow: "hidden" }}>

        {/* HERO */}
        <section className="flex flex-col items-center justify-center px-4 pt-20 pb-10 text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border-2"
            style={{ borderColor: "#00ff87", color: "#00ff87", background: "rgba(0,255,135,0.08)" }}
          >
            ✨ Now in beta
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white mb-5 leading-tight max-w-3xl">
            Find the breakout videos in your niche{" "}
            <span style={{ color: "#00ff87", textShadow: "0 0 40px rgba(0,255,135,0.45)" }}>
              before you make your next one.
            </span>
          </h1>

          <p className="text-lg mb-8 max-w-xl" style={{ color: "#888" }}>
            TubeWatch surfaces the videos quietly overperforming across the channels you compete
            with — then your AI coach turns them into your next upload. Built for{" "}
            <strong style={{ color: "#ccc" }}>growing creators, roughly 1K–100K subs.</strong>
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="cta-primary px-8 py-3.5 rounded-xl font-black text-black text-lg transition-transform hover:scale-105"
              style={{ background: "#00ff87" }}
            >
              🚀 Get started free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl font-semibold border-2 text-lg transition-all hover:border-white hover:text-white"
              style={{ borderColor: "#2a2a2a", color: "#888" }}
            >
              Sign in
            </Link>
          </div>

          <p className="mt-4 text-sm" style={{ color: "#444" }}>
            No credit card required · Cancel anytime
          </p>
        </section>

        {/* FEATURE PILLS */}
        <div className="flex gap-3 justify-center flex-wrap px-4 mb-14">
          {features.map((f) => (
            <span
              key={f.label}
              className="px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5"
              style={{ background: "#1a1a1a", color: "#ccc", border: "1px solid #2a2a2a" }}
            >
              {f.icon} {f.label}
            </span>
          ))}
        </div>

        {/* VIDEO CARDS MARQUEE */}
        <div className="mb-16" style={{ position: "relative" }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: "100px", zIndex: 10,
            background: "linear-gradient(to right, #0f0f0f, transparent)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: "100px", zIndex: 10,
            background: "linear-gradient(to left, #0f0f0f, transparent)",
            pointerEvents: "none",
          }} />

          <div style={{ overflow: "hidden", padding: "10px 0" }}>
            <div className="marquee-inner">
              {doubled.map((card, i) => (
                <div
                  key={i}
                  className="video-card flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer"
                  style={{ width: "220px", background: card.bg, border: "1px solid #222" }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      height: "124px",
                      background: card.bg,
                      fontSize: "52px",
                      borderBottom: "1px solid #1c1c1c",
                      position: "relative",
                    }}
                  >
                    {card.emoji}
                    <div style={{
                      position: "absolute", bottom: "8px", right: "8px",
                      background: "rgba(0,0,0,0.75)", borderRadius: "4px",
                      padding: "2px 5px", fontSize: "10px", color: "#fff", fontWeight: 700,
                    }}>
                      ▶ {card.duration}
                    </div>
                  </div>
                  <div className="p-3">
                    <p
                      className="text-white text-xs font-semibold mb-1"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                        lineHeight: "1.4",
                      }}
                    >
                      {card.title}
                    </p>
                    <p className="text-xs mb-2" style={{ color: "#555" }}>{card.views}</p>
                    <span
                      className={card.badge.includes("🔥") || card.badge.includes("🚀") ? "badge-hot inline-block" : "inline-block"}
                      style={{
                        padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 700,
                        background: card.badgeColor + "22", color: card.badgeColor,
                        border: `1px solid ${card.badgeColor}55`,
                      }}
                    >
                      {card.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FEATURE CAROUSEL */}
        <FeatureCarousel />

        {/* COMPARISON VS OTHER TOOLS */}
        <ComparisonSection />

        {/* PRICING */}
        <section className="px-4 pb-24 max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">Simple, honest pricing</h2>
            <p style={{ color: "#888" }}>Start free. Upgrade when you&apos;re ready to go deeper.</p>
          </div>

          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {/* Free */}
            <div className="rounded-2xl border p-8 flex flex-col" style={{ borderColor: "#2a2a2a", background: "#111" }}>
              <p className="text-sm font-bold mb-2" style={{ color: "#888" }}>FREE</p>
              <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-black text-white">${PLANS.free.priceMonthly}</span>
                <span className="mb-1" style={{ color: "#555" }}>/mo</span>
              </div>
              <PlanFeatures features={PLANS.free.features} color="#aaa" />
              <a href="/signup" className="block text-center py-3 rounded-xl font-bold border transition-colors hover:border-white hover:text-white" style={{ borderColor: "#2a2a2a", color: "#888" }}>
                {PLANS.free.ctaFree}
              </a>
            </div>

            {/* Pro — highlighted */}
            <div className="rounded-2xl border p-8 flex flex-col relative" style={{ borderColor: "#00ff87", background: "#0a1a0f", boxShadow: "0 0 40px rgba(0,255,135,0.12)" }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black" style={{ background: "#00ff87", color: "#000" }}>
                MOST POPULAR
              </div>
              <p className="text-sm font-bold mb-2" style={{ color: "#00ff87" }}>PRO</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-black text-white">${PLANS.pro.priceMonthly}</span>
                <span className="mb-1" style={{ color: "#555" }}>/mo</span>
              </div>
              <PlanFeatures features={PLANS.pro.features} color="#ccc" />
              <a href="/signup" className="block text-center py-3 rounded-xl font-black transition-transform hover:scale-105" style={{ background: "#00ff87", color: "#000" }}>
                {PLANS.pro.ctaUpgrade} →
              </a>
            </div>

            {/* Growth */}
            <div className="rounded-2xl border p-8 flex flex-col" style={{ borderColor: "#2a2a2a", background: "#111" }}>
              <p className="text-sm font-bold mb-2" style={{ color: "#888" }}>GROWTH</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-black text-white">${PLANS.growth.priceMonthly}</span>
                <span className="mb-1" style={{ color: "#555" }}>/mo</span>
              </div>
              <PlanFeatures features={PLANS.growth.features} color="#aaa" />
              <a href="/signup" className="block text-center py-3 rounded-xl font-bold border transition-colors hover:border-white hover:text-white" style={{ borderColor: "#2a2a2a", color: "#888" }}>
                {PLANS.growth.ctaUpgrade} →
              </a>
            </div>
          </div>

          <p className="text-center mt-8 text-sm" style={{ color: "#444" }}>
            {PRICING_FOOTNOTE}
          </p>
        </section>

        {/* BOTTOM CTA */}
        <div className="text-center pb-24 px-4">
          <div className="inline-block mb-4 text-4xl">🎬</div>
          <p className="text-3xl font-black text-white mb-2">Ready to find your next breakout — before you film it?</p>
          <p className="mb-8 text-lg" style={{ color: "#666" }}>
            See what&apos;s already winning in your niche, then make your version.
          </p>
          <a
            href="/signup"
            className="inline-block px-12 py-4 rounded-xl font-black text-black text-xl transition-transform hover:scale-105"
            style={{ background: "#00ff87", boxShadow: "0 0 40px rgba(0,255,135,0.35)" }}
          >
            {PLANS.free.ctaFree} →
          </a>
        </div>

        {/* FOOTER */}
        <footer
          className="flex items-center justify-center gap-6 py-8 px-4 border-t text-sm"
          style={{ borderColor: "#1a1a1a", color: "#666" }}
        >
          <span>© 2026 TubeWatch</span>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </footer>

      </main>
    </>
  );
}
