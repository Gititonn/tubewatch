"use client";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useState, useEffect } from "react";

const PROMPTS = [
  "What title formats are getting the most clicks right now?",
  "How do I find my channel's next breakout video topic?",
  "What makes a thumbnail stop the scroll in 2025?",
  "Why do my videos get views but not subscribers?",
  "What posting frequency actually moves the needle for small creators?",
  "How do I use competitor outlier videos to guide my content?",
];

export default function AIPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  // Auto-run a question passed via ?q= (e.g. from the dashboard starter chips).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && q.trim()) {
      setQuestion(q);
      ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setStreaming(false);
    setAnswer("");
    setLocked(false);
    setActivePrompt(q);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
        // Free plan → show a real example of what Pro unlocks instead of a
        // dead-end error. An honest "taste before the paywall".
        if (res.status === 402) {
          setLocked(true);
          setLoading(false);
          return;
        }
        const data = await res.json().catch(() => ({}));
        setAnswer(data.error ?? "Something went wrong. Try again.");
        setLoading(false);
        return;
      }

      if (!res.body) { setLoading(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      setLoading(false);
      setStreaming(true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setAnswer(full);
      }
      setStreaming(false);
    } catch {
      setLoading(false);
      setStreaming(false);
      setAnswer("Something went wrong. Try again.");
    }
  }

  return (
    <div className="p-8 max-w-3xl" style={{ color: "var(--text-primary)" }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", boxShadow: "0 0 30px rgba(168,85,247,0.5)" }}
          >
            🧠
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">AI Strategy Coach</h1>
            <p className="text-sm font-semibold" style={{ color: "#a855f7" }}>Powered by the TubeWatch AI Engine · Built for creators</p>
          </div>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>
          Ask anything about YouTube growth, video strategy, or what&apos;s working right now. Instant AI answers tuned for 0–100K channels.
        </p>
      </div>

      {/* Quick prompts */}
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Tap to ask</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => { setQuestion(p); ask(p); }}
              className="text-left px-4 py-3 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: activePrompt === p
                  ? "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))"
                  : "var(--bg-card)",
                border: `1px solid ${activePrompt === p ? "rgba(168,85,247,0.5)" : "var(--border)"}`,
                color: activePrompt === p ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Custom question */}
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Ask your own question</p>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(question)}
            placeholder="e.g. Why do reaction videos outperform original content?"
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <button
            onClick={() => ask(question)}
            disabled={loading || !question.trim()}
            className="px-5 py-3 rounded-xl font-black text-sm transition-all hover:scale-105 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff" }}
          >
            Ask AI
          </button>
        </div>
      </div>

      {/* Welcome / empty state — shown before the first question */}
      {!loading && !answer && !locked && (
        <div
          className="rounded-2xl border p-6 mb-8 flex items-start gap-4"
          style={{
            borderColor: "rgba(0,255,135,0.25)",
            background: "linear-gradient(135deg, rgba(0,255,135,0.07) 0%, var(--bg-card) 70%)",
          }}
        >
          <div className="text-3xl flex-shrink-0">👋</div>
          <div>
            <h3 className="font-black mb-1" style={{ color: "#00ff87" }}>
              Your growth strategist is ready
            </h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Tap a prompt above or ask your own question. Every answer is tuned for small,
              0–100K channels — no big-audience assumptions, just high-leverage tactics
              (packaging, thumbnails, organic search) you can run this week.
            </p>
          </div>
        </div>
      )}

      {/* Answer */}
      {(loading || answer) && (
        <div
          className="rounded-2xl border p-6 mb-8"
          style={{
            borderColor: "rgba(168,85,247,0.3)",
            background: "var(--bg-card)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">🧠</span>
            <span className="text-sm font-black" style={{ color: "#a855f7" }}>TubeWatch AI Engine</span>
            {loading && (
              <span className="flex gap-1 ml-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#a855f7", opacity: 0.7, animation: `bounce ${0.6 + i * 0.15}s ease-in-out infinite alternate` }} />
                ))}
              </span>
            )}
          </div>
          {answer && (
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              <MarkdownContent content={answer} />
              {streaming && <span className="tw-stream-cursor" aria-hidden="true" />}
            </div>
          )}
        </div>
      )}

      {/* Locked preview — free users see a real example answer + upgrade path */}
      {locked && (
        <div
          className="rounded-2xl border p-6 mb-8 relative overflow-hidden"
          style={{
            borderColor: "rgba(168,85,247,0.35)",
            background: "linear-gradient(135deg, rgba(168,85,247,0.08) 0%, var(--bg-card) 70%)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🧠</span>
            <span className="text-sm font-black" style={{ color: "#a855f7" }}>TubeWatch AI Engine</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.25)", color: "#c084fc" }}>
              EXAMPLE
            </span>
          </div>

          {/* Sample answer in the real AI Engine style, partially faded to tease the upgrade */}
          <div className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <p className="mb-3">
              For a small channel, the win is <strong style={{ color: "var(--text-primary)" }}>borrowing search demand you can actually rank for</strong>.
              Instead of broad titles, target a specific question people already type, then front-load the payoff in the
              first 3 words so it survives the suggested-feed crop.
            </p>
            <p className="font-bold mb-1" style={{ color: "var(--text-primary)" }}>Your Move:</p>
            <ul className="space-y-1">
              <li>• Rewrite your last title as a specific question a beginner would search.</li>
              <li>• A/B two thumbnails with one big readable word each.</li>
            </ul>
          </div>

          {/* Fade + upgrade gate */}
          <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
              That&apos;s a sample. Unlock the AI Engine to ask <strong style={{ color: "var(--text-primary)" }}>your own</strong> questions about your channel — unlimited on Pro.
            </p>
            <a
              href="/billing"
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-black transition-transform hover:scale-105"
              style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff" }}
            >
              Unlock with Pro →
            </a>
          </div>
        </div>
      )}

      {/* Feature cards */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>AI is everywhere in TubeWatch</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[
            { icon: "⭐", title: "Outlier Score", desc: "Hit “Explain” on any video to get an AI Engine breakdown of why it over- or under-performed", href: "/outlier" },
            { icon: "🔥", title: "Competitor Outliers", desc: "See why competitor videos exploded with one-click AI analysis", href: "/competitors/outliers" },
            { icon: "📈", title: "Trending Analysis", desc: "Spot what’s blowing up and understand the patterns behind it", href: "/trending" },
            { icon: "🎯", title: "Pattern Detection", desc: "AI detects title formulas and content strategies from your tracked channels", href: "/patterns" },
          ].map((c) => (
            <a
              key={c.title}
              href={c.href}
              className="rounded-xl border p-4 block transition-all hover:scale-[1.02]"
              style={{ borderColor: "rgba(168,85,247,0.2)", background: "rgba(168,85,247,0.04)" }}
            >
              <div className="text-xl mb-2">{c.icon}</div>
              <div className="font-bold text-sm text-foreground mb-1">{c.title}</div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{c.desc}</div>
            </a>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
