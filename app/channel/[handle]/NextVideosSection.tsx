"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Idea = { title: string; hook: string; why: string; basedOn: string };

const LOADING_LINES = [
  "Reading this channel's breakouts…",
  "Finding the patterns worth borrowing…",
  "Writing 3 videos you could shoot this week…",
];

export default function NextVideosSection({ handle }: { handle: string }) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [status, setStatus] = useState<"loading" | "done" | "limited" | "error">("loading");
  const [line, setLine] = useState(0);

  useEffect(() => {
    // Rotate the loading copy so the wait feels like work happening, not a hang.
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai/next-videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle }),
        });
        if (cancelled) return;
        if (res.status === 429) {
          setStatus("limited");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.ideas) && data.ideas.length > 0) {
          setIdeas(data.ideas);
          setStatus("done");
        } else {
          setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  return (
    <div
      className="rounded-2xl border p-5 md:p-6 mb-8"
      style={{
        borderColor: "rgba(0,255,135,0.28)",
        background: "linear-gradient(135deg, rgba(0,255,135,0.07) 0%, rgba(0,255,135,0.02) 55%, var(--bg-card) 100%)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🎬</span>
        <h2 className="text-lg md:text-xl font-black" style={{ color: "var(--text-primary)" }}>
          3 videos this channel should make next
        </h2>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
        Built from this channel&apos;s breakouts — the patterns worth borrowing, turned into your next uploads.
      </p>

      {status === "loading" && (
        <div className="flex items-center gap-3 py-6" style={{ color: "var(--text-secondary)" }}>
          <span
            className="inline-block w-4 h-4 rounded-full border-2 animate-spin"
            style={{ borderColor: "rgba(0,255,135,0.3)", borderTopColor: "#00ff87" }}
          />
          <span className="text-sm">{LOADING_LINES[line]}</span>
        </div>
      )}

      {status === "done" && ideas && (
        <>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {ideas.map((idea, i) => (
              <div
                key={i}
                className="rounded-xl border p-4 flex flex-col gap-2"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: "#00ff87", color: "#000" }}
                  >
                    {i + 1}
                  </span>
                  <h3 className="font-bold leading-snug" style={{ fontSize: 15, color: "var(--text-primary)" }}>
                    {idea.title}
                  </h3>
                </div>
                {idea.hook && (
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    <span className="font-bold" style={{ color: "#00ff87" }}>Hook:</span> {idea.hook}
                  </p>
                )}
                {idea.why && (
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {idea.why}
                  </p>
                )}
                {idea.basedOn && (
                  <p className="text-xs mt-auto pt-1" style={{ color: "var(--text-muted)" }}>
                    <span className="opacity-70">Modelled on:</span> {idea.basedOn}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="px-5 py-2.5 rounded-xl font-black text-sm transition-transform hover:scale-105"
              style={{ background: "#00ff87", color: "#000" }}
            >
              Get ideas like this for your channel →
            </Link>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Free · connect your channel in one click
            </span>
          </div>
        </>
      )}

      {status === "limited" && (
        <div className="py-4">
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
            You&apos;ve hit today&apos;s free limit for instant ideas. Sign up to keep generating for any channel — including your own.
          </p>
          <Link
            href="/signup"
            className="inline-block px-5 py-2.5 rounded-xl font-black text-sm"
            style={{ background: "#00ff87", color: "#000" }}
          >
            Sign up free →
          </Link>
        </div>
      )}

      {status === "error" && (
        <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>
          Couldn&apos;t generate ideas for this channel right now. Try another channel, or{" "}
          <Link href="/signup" style={{ color: "#00ff87" }}>
            sign up
          </Link>{" "}
          to run it on your own.
        </p>
      )}
    </div>
  );
}
