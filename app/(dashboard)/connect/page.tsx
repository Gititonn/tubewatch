"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConnectPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/youtube/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-foreground mb-2">Connect any channel</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
        Enter any YouTube channel handle or URL — yours or a competitor&apos;s — to get started.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            Channel handle or URL
          </label>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg text-foreground text-sm outline-none transition-all"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            placeholder="@mkbhd or https://youtube.com/@mkbhd"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-lg font-semibold text-black text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "#00ff87" }}
        >
          {loading ? "Connecting…" : "Connect channel"}
        </button>
      </form>

      <div
        className="mt-8 rounded-xl border p-4 text-sm"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        <p className="mb-1 text-foreground font-medium">Accepted formats</p>
        <ul className="space-y-1">
          <li>@channelhandle</li>
          <li>https://youtube.com/@handle</li>
          <li>https://www.youtube.com/c/channelname</li>
        </ul>
      </div>
    </div>
  );
}
