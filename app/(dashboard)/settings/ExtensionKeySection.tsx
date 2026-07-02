"use client";
import { useEffect, useState } from "react";

/**
 * Settings → Browser Extension. Shows/generates the per-user API key and offers
 * a 1-click "Connect extension" that posts the key to the installed extension
 * (via a postMessage bridge its content script listens for on this origin), so
 * the user never has to copy-paste into the popup. Manual copy stays as a
 * fallback for anyone whose extension isn't installed yet.
 */
type ConnectState = "idle" | "connecting" | "connected" | "notfound";

export default function ExtensionKeySection() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [extensionPresent, setExtensionPresent] = useState(false);
  const [connect, setConnect] = useState<ConnectState>("idle");

  useEffect(() => {
    fetch("/api/settings/extension-key")
      .then((r) => r.json())
      .then((d) => setApiKey(d.apiKey ?? null))
      .finally(() => setLoading(false));
  }, []);

  // Listen for the extension's content-script messages (presence + confirmation).
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const d = e.data;
      if (!d || d.source !== "tubewatch-extension") return;
      if (d.type === "present") setExtensionPresent(true);
      if (d.type === "connected") setConnect("connected");
    }
    window.addEventListener("message", onMsg);
    window.postMessage({ source: "tubewatch-web", type: "ping" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  async function generate() {
    setGenerating(true);
    const r = await fetch("/api/settings/extension-key", { method: "POST" });
    const d = await r.json();
    if (d.apiKey) setApiKey(d.apiKey);
    setConnect("idle");
    setGenerating(false);
  }

  function copy() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function connectExtension() {
    if (!apiKey) return;
    setConnect("connecting");
    window.postMessage({ source: "tubewatch-web", type: "connect-extension", apiKey }, window.location.origin);
    window.setTimeout(() => setConnect((s) => (s === "connected" ? s : "notfound")), 1800);
  }

  const connectLabel =
    connect === "connecting" ? "Connecting…"
    : connect === "connected" ? "✓ Extension connected"
    : "🔗 Connect extension (1-click)";

  return (
    <section
      className="rounded-xl border p-6 mb-4"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
        Browser Extension
      </h2>

      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        The TubeWatch extension overlays outlier scores on YouTube. Install it, then
        connect it to your account in one click.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : apiKey ? (
        <>
          <button
            onClick={connectExtension}
            disabled={connect === "connecting" || connect === "connected"}
            className="px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-70"
            style={{
              background: connect === "connected" ? "rgba(0,255,135,0.15)" : "#00ff87",
              color: connect === "connected" ? "#00ff87" : "#000",
              border: connect === "connected" ? "1px solid rgba(0,255,135,0.4)" : "none",
            }}
          >
            {connectLabel}
          </button>

          {connect === "notfound" && (
            <p className="mt-2 text-xs" style={{ color: "#ffcc44" }}>
              Extension not detected. Install it and reload this page, or paste the key manually below.
            </p>
          )}
          {extensionPresent && connect === "idle" && (
            <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>Extension detected ✓</p>
          )}

          {/* Manual fallback */}
          <p className="text-xs mt-5 mb-1.5" style={{ color: "var(--text-muted)" }}>Or paste this key into the extension popup:</p>
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
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
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
