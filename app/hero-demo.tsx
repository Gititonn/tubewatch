"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The landing page's proof widget: paste any channel handle, land on the
 * public /channel/[handle] page with real outlier scores — no signup. The
 * sync engine is the demo; icons and sample cards convert nobody.
 */
export default function HeroDemo() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function go(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().replace(/^@/, "");
    if (q) router.push(`/channel/${encodeURIComponent(q)}`);
  }

  return (
    <div className="w-full max-w-lg mx-auto mt-10">
      <p className="text-sm font-bold mb-3" style={{ color: "#00ff87" }}>
        Don&apos;t take our word for it — score a real channel right now
      </p>
      <form onSubmit={go} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Paste any channel — @handle"
          aria-label="YouTube channel handle"
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#fff" }}
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-transform hover:scale-105"
          style={{ background: "#00ff87", color: "#000" }}
        >
          See its outliers
        </button>
      </form>
      <p className="mt-2 text-xs" style={{ color: "#555" }}>
        Live data, scored in seconds. No account, no email.
      </p>
    </div>
  );
}
