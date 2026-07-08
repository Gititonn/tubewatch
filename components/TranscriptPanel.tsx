"use client";

import { useState } from "react";

/**
 * Fetch, view, copy, and download a video's transcript — the raw material for
 * writing your own version of a breakout's script. Backed by the existing
 * /api/youtube/transcript endpoint (timestamped segments + full text).
 *
 * Two download formats: .txt (clean prose, for drafting a script) and .srt
 * (timestamped, for editors/subtitles). Downloads are client-side Blob links,
 * which work in any user's browser.
 */

type Segment = { text: string; offset: number; duration: number };
type Loaded = { fullText: string; segments: Segment[]; wordCount: number };

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "transcript"
  );
}

function srtTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(millis, 3)}`;
}

function toSrt(segments: Segment[]): string {
  return segments
    .map((seg, i) => {
      const start = srtTime(seg.offset);
      const end = srtTime(seg.offset + seg.duration);
      return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
    })
    .join("\n");
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function TranscriptPanel({ videoId, title }: { videoId: string; title: string }) {
  const [state, setState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  async function load() {
    setState("loading");
    setError("");
    try {
      const res = await fetch(`/api/youtube/transcript?videoId=${encodeURIComponent(videoId)}`);
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Transcript unavailable for this video.");
        setState("error");
        return;
      }
      setData({ fullText: d.fullText, segments: d.segments ?? [], wordCount: d.wordCount ?? 0 });
      setState("loaded");
    } catch {
      setError("Couldn't load the transcript — try again.");
      setState("error");
    }
  }

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the download buttons still work */
    }
  }

  const base = slug(title);
  const btn = {
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    background: "transparent",
    cursor: "pointer",
  } as const;

  if (state === "idle") {
    return (
      <button
        onClick={load}
        className="w-full py-2.5 rounded-xl font-bold text-sm transition-colors hover:opacity-90"
        style={{ background: "rgba(0,255,135,0.08)", border: "1px solid rgba(0,255,135,0.35)", color: "#00ff87" }}
      >
        📄 Get transcript / script
      </button>
    );
  }

  if (state === "loading") {
    return (
      <div className="w-full py-2.5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Fetching transcript…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="w-full py-2.5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        {error} <button onClick={load} className="underline" style={{ color: "#00ff87" }}>Retry</button>
      </div>
    );
  }

  // loaded
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--bg-hover, rgba(255,255,255,0.02))" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Transcript · {data?.wordCount.toLocaleString()} words
        </span>
        <div className="flex gap-1.5">
          <button onClick={copy} style={btn}>{copied ? "✓ Copied" : "Copy"}</button>
          <button onClick={() => data && download(`${base}.txt`, data.fullText)} style={{ ...btn, color: "#00ff87", borderColor: "rgba(0,255,135,0.35)" }}>
            .txt
          </button>
          <button onClick={() => data && download(`${base}.srt`, toSrt(data.segments))} style={btn}>
            .srt
          </button>
        </div>
      </div>
      <div
        className="text-xs leading-relaxed whitespace-pre-wrap"
        style={{ color: "var(--text-secondary)", maxHeight: 200, overflowY: "auto" }}
      >
        {data?.fullText}
      </div>
    </div>
  );
}
