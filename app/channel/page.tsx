"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChannelSearchPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function go(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().replace(/^@/, "");
    if (q) router.push(`/channel/${encodeURIComponent(q)}`);
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6" style={{ color: "var(--text-primary)" }}>
      <h1 className="text-3xl md:text-4xl font-black text-center mb-2">Search any YouTube channel</h1>
      <p className="text-center mb-8 max-w-md" style={{ color: "var(--text-secondary)", fontSize: 15 }}>
        See any channel&apos;s recent videos ranked by TubeWatch&apos;s age-adjusted outlier score — no login needed.
      </p>
      <form onSubmit={go} className="w-full max-w-lg flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="@MrBeast or a channel handle…"
          autoFocus
          className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-40"
          style={{ background: "#00ff87", color: "#000" }}
        >
          Search
        </button>
      </form>
    </div>
  );
}
