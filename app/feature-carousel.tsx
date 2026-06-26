"use client";

import { useState, useEffect } from "react";

const slides = [
  {
    tag: "📊 Dashboard",
    title: "Your channel at a glance",
    desc: "Subscribers, avg views, top outlier score, and recent video performance — all in one clean view.",
    mockup: <DashboardMockup />,
  },
  {
    tag: "🔥 Outlier Detection",
    title: "Find your breakout videos",
    desc: "We score every video against your channel's average. Instantly see which videos punched above their weight.",
    mockup: <OutlierMockup />,
  },
  {
    tag: "⚖️ Channel Compare",
    title: "Stack yourself against anyone",
    desc: "Add up to 4 channels side-by-side. Compare subscribers, avg views, views-per-sub, and top outlier videos.",
    mockup: <CompareMockup />,
  },
  {
    tag: "📈 Video Analytics",
    title: "Every video, ranked and scored",
    desc: "Browse your full video library sorted by outlier score, views, or date. Know exactly what's working.",
    mockup: <VideosMockup />,
  },
];

export default function FeatureCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((a) => (a + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, [paused]);

  const slide = slides[active];

  return (
    <section className="px-4 pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">
            Everything you need to grow
          </h2>
          <p style={{ color: "#666" }}>
            Built for creators who are serious about understanding their channel.
          </p>
        </div>

        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "#2a2a2a", background: "#111" }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Tab bar */}
          <div
            className="flex border-b"
            style={{ borderColor: "#2a2a2a", background: "#0d0d0d" }}
          >
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="flex-1 py-3 px-2 text-xs font-semibold transition-all"
                style={{
                  color: active === i ? "#00ff87" : "#555",
                  borderBottom: active === i ? "2px solid #00ff87" : "2px solid transparent",
                  background: "transparent",
                }}
              >
                {s.tag}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="grid gap-0" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
            {/* Left: text */}
            <div
              className="p-8 flex flex-col justify-center border-r"
              style={{ borderColor: "#1a1a1a" }}
            >
              <h3 className="text-xl font-black text-white mb-3">{slide.title}</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#666" }}>
                {slide.desc}
              </p>
              {/* Progress dots */}
              <div className="flex gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      background: active === i ? "#00ff87" : "#2a2a2a",
                      width: active === i ? "24px" : "8px",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Right: mockup */}
            <div className="p-6 flex items-center justify-center" style={{ background: "#0a0a0a", minHeight: "320px" }}>
              <div className="w-full">{slide.mockup}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Mockup components ── */

function DashboardMockup() {
  return (
    <div className="space-y-3">
      {/* stat cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Subscribers", val: "24.3K", icon: "👥" },
          { label: "Avg Views", val: "18.4K", icon: "▶️" },
          { label: "Tracked", val: "142", icon: "📹" },
          { label: "Top Outlier", val: "6.2x", icon: "🔥", accent: "#ff4444" },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-lg p-3"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          >
            <div className="text-base mb-1">{c.icon}</div>
            <div className="text-xs mb-0.5" style={{ color: "#555" }}>{c.label}</div>
            <div className="text-base font-black" style={{ color: c.accent ?? "white" }}>{c.val}</div>
          </div>
        ))}
      </div>
      {/* bar chart */}
      <div className="rounded-lg p-3" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        <div className="text-xs font-semibold text-white mb-2">Recent Video Performance</div>
        <div className="flex items-end gap-1 h-16">
          {[30, 45, 20, 80, 55, 35, 100, 42, 68, 25, 90, 38].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{
              height: `${h}%`,
              background: h >= 80 ? "#ff4444" : h >= 60 ? "#ffaa00" : h >= 40 ? "#00ff87" : "#2a2a2a",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function OutlierMockup() {
  const videos = [
    { title: "I ate one food for 30 days", views: "2.1M", score: 6.2, color: "#ff4444" },
    { title: "The thumbnail formula that works", views: "847K", score: 3.1, color: "#ff4444" },
    { title: "Behind my studio setup", views: "445K", score: 2.4, color: "#ffaa00" },
    { title: "Q&A: your questions answered", views: "38K", score: 0.6, color: "#2a2a2a" },
  ];
  return (
    <div className="space-y-2">
      {videos.map((v, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{ background: "#1a1a1a", border: "1px solid #222" }}
        >
          <div className="w-12 h-7 rounded flex-shrink-0" style={{ background: "#222" }} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{v.title}</div>
            <div className="text-xs" style={{ color: "#555" }}>{v.views} views</div>
          </div>
          <span
            className="text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ color: v.color, background: v.color + "20", border: `1px solid ${v.color}44` }}
          >
            {v.score}x
          </span>
        </div>
      ))}
    </div>
  );
}

function CompareMockup() {
  const channels = [
    { name: "CreatorA", subs: "24.3K", avg: "18K", score: "3.2x", color: "#00ff87" },
    { name: "CreatorB", subs: "61K", avg: "9K", score: "1.8x", color: "#888" },
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {channels.map((c, i) => (
          <div key={i} className="rounded-lg p-3" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <div className="w-8 h-8 rounded-full mb-2" style={{ background: "#333" }} />
            <div className="text-xs font-bold text-white">{c.name}</div>
            <div className="text-lg font-black mt-1" style={{ color: "#00ff87" }}>{c.subs}</div>
            <div className="text-xs" style={{ color: "#555" }}>subscribers</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        {[
          { label: "Avg Views", vals: ["18K 🏆", "9K"] },
          { label: "Views/Sub", vals: ["0.74 🏆", "0.15"] },
          { label: "Top Outlier", vals: ["3.2x 🏆", "1.8x"] },
        ].map((row, i) => (
          <div key={i} className="grid grid-cols-3 px-3 py-2 border-b last:border-0" style={{ borderColor: "#222" }}>
            <div className="text-xs" style={{ color: "#555" }}>{row.label}</div>
            {row.vals.map((v, j) => (
              <div key={j} className="text-xs font-semibold text-center" style={{ color: v.includes("🏆") ? "#00ff87" : "#888" }}>{v}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function VideosMockup() {
  const vids = [
    { emoji: "🎬", title: "Studio tour 2024", views: "671K", score: "3.1x", sc: "#ff4444" },
    { emoji: "📅", title: "30 days of posting", views: "312K", score: "2.2x", sc: "#ffaa00" },
    { emoji: "🎤", title: "Honest gear review", views: "156K", score: "1.4x", sc: "#00ff87" },
    { emoji: "🏆", title: "100K milestone", views: "89K", score: "0.9x", sc: "#444" },
  ];
  return (
    <div className="space-y-2">
      {vids.map((v, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg px-3 py-2"
          style={{ background: "#1a1a1a", border: "1px solid #222" }}
        >
          <div
            className="w-10 h-7 rounded flex-shrink-0 flex items-center justify-center text-sm"
            style={{ background: "#222" }}
          >
            {v.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{v.title}</div>
          </div>
          <div className="text-xs font-semibold text-right flex-shrink-0 mr-2" style={{ color: "#888" }}>
            {v.views}
          </div>
          <span
            className="text-xs font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ color: v.sc, background: v.sc + "20", border: `1px solid ${v.sc}44` }}
          >
            {v.score}
          </span>
        </div>
      ))}
    </div>
  );
}
