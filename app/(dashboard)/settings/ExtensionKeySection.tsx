"use client";
import { useEffect, useState } from "react";

/**
 * Settings → Browser Extension. Shows/generates the per-user API key the
 * TubeWatch browser extension uses to authenticate. Client component because
 * key generation and clipboard copy are interactive.
 */
export default function ExtensionKeySection() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/settings/extension-key")
      .then((r) => r.json())
      .then((d) => setApiKey(d.apiKey ?? null))
      .finally(() => setLoading(false));
  }, []);

  async function generate() {
    setGenerating(true);
    const r = await fetch("/api/settings/extension-key", { method: "POST" });
    const d = await r.json();
    if (d.apiKey) setApiKey(d.apiKey);
    setGenerating(false);
  }

  function copy() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section
      className="rounded-xl border p-6 mb-4"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
        Browser Extension
      </h2>

      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        The TubeWatch extension overlays outlier scores on YouTube. Paste this
        API key into the extension popup to connect it to your account.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : apiKey ? (
        <>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs truncate"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              {apiKey}
            </code>
            <button
              onClick={copy}
              className="px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
              style={{ background: "#00ff87", color: "#000" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="mt-3 text-xs font-medium disabled:opacity-40"
            style={{ color: "var(--text-muted)" }}
          >
            {generating ? "Regenerating…" : "Regenerate key (invalidates the old one)"}
          </button>
        </>
      ) : (
        <button
          onClick={generate}
          disabled={generating}
          className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
          style={{ background: "#00ff87", color: "#000" }}
        >
          {generating ? "Generating…" : "Generate API key"}
        </button>
      )}
    </section>
  );
}
