"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The landing-page "let me try this" entry. Type any channel → land on the
// public channel page, which instantly generates 3 next-video ideas with no
// login. This is the front door; keep it dead simple.
export default function HeroTryIt() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function go(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().replace(/^@/, "");
    if (q) router.push(`/channel/${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={go} className="w-full max-w-xl">
      <div
        className="flex gap-2 p-2 rounded-2xl"
        style={{ background: "#161616", border: "1px solid #2a2a2a" }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Paste any YouTube channel — e.g. @mkbhd"
          aria-label="YouTube channel handle"
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none bg-transparent"
          style={{ color: "#fff" }}
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-5 py-3 rounded-xl font-black text-black text-sm whitespace-nowrap transition-transform hover:scale-105 disabled:opacity-40"
          style={{ background: "#00ff87" }}
        >
          Get 3 video ideas →
        </button>
      </div>
      <p className="mt-2 text-xs" style={{ color: "#555" }}>
        Free, no signup — try your own channel or a competitor&apos;s.
      </p>
    </form>
  );
}
