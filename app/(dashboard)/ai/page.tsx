"use client";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useState } from "react";

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
  const [activePrompt, setActivePrompt] = useState<string | null>(null);

  async function ask(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setAnswer("");
    setActivePrompt(q);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setAnswer(full);
      }
    } catch {
      setLoading(false);
      setAnswer("Something went wrong. Try again.");
    }
  }

  return (
    <div className="p-8 max-w-3xl" style={{ color: "#fff" }}>
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
            <h1 className="text-2xl font-black text-white">AI Strategy Coach</h1>
            <p className="text-sm font-semibold" style={{ color: "#a855f7" }}>Powered by Claude · Built for creators</p>
          </div>
        </div>
        <p style={{ color: "#666" }}>
          Ask anything about YouTube growth, video strategy, or what&apos;s working right now. Instant AI answers tuned for 0–100K channels.
        </p>
      </div>

      {/* Quick prompts */}
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#444" }}>Tap to ask</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => { setQuestion(p); ask(p); }}
              className="text-left px-4 py-3 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background: activePrompt === p
                  ? "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${activePrompt === p ? "rgba(168,85,247,0.5)" : "#2a2a2a"}`,
                color: activePrompt === p ? "#e9d5ff" : "#888",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Custom question */}
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#444" }}>Ask your own question</p>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(question)}
            placeholder="e.g. Why do reaction videos outperform original content?"
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "#111", border: "1px solid #2a2a2a", color: "#fff" }}
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

      {/* Answer */}
      {(loading || answer) && (
        <div
          className="rounded-2xl border p-6 mb-8"
          style={{
            borderColor: "rgba(168,85,247,0.3)",
            background: "linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(10,10,10,1) 60%)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">🧠</span>
            <span className="text-sm font-black" style={{ color: "#a855f7" }}>Claude</span>
            {loading && (
              <span className="flex gap-1 ml-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#a855f7", opacity: 0.7, animation: `bounce ${0.6 + i * 0.15}s ease-in-out infinite alternate` }} />
                ))}
              </span>
            )}
          </div>
          {answer && (
            <div className="text-sm" style={{ color: "#ddd" }}>
              <MarkdownContent content={answer} />
            </div>
          )}
        </div>
      )}

      {/* Feature cards */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#444" }}>AI is everywhere in TubeWatch</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[
            { icon: "⭐", title: "Outlier Score", desc: "Hit “Explain” on any video to get a Claude breakdown of why it over- or under-performed", href: "/outlier" },
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
              <div className="font-bold text-sm text-white mb-1">{c.title}</div>
              <div className="text-xs leading-relaxed" style={{ color: "#555" }}>{c.desc}</div>
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
