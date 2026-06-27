"use client"
import { useState, useEffect } from "react"

type VideoItem = {
  youtubeVideoId: string
  title: string
  channelId: string
  channelName: string
  thumbnailUrl: string | null
  viewCount: number
  likeCount: number
  durationSeconds: number
  publishedAt: string | null
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K"
  return n.toString()
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const REGIONS = [
  { label: "US", value: "US" },
  { label: "GB", value: "GB" },
  { label: "CA", value: "CA" },
  { label: "AU", value: "AU" },
  { label: "IN", value: "IN" },
  { label: "BR", value: "BR" },
]

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Gaming", value: "20" },
  { label: "Music", value: "10" },
  { label: "Entertainment", value: "24" },
  { label: "How-to", value: "26" },
  { label: "Sports", value: "17" },
  { label: "News", value: "25" },
]

export default function TrendingPage() {
  const [type, setType] = useState<"videos" | "shorts">("videos")
  const [region, setRegion] = useState("US")
  const [category, setCategory] = useState("")
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tracked, setTracked] = useState<Set<string>>(new Set())
  const [tracking, setTracking] = useState<Set<string>>(new Set())
  const [aiOpen, setAiOpen] = useState<string | null>(null)
  const [aiText, setAiText] = useState<Record<string, string>>({})
  const [aiLoading, setAiLoading] = useState<Set<string>>(new Set())

  useEffect(() => {
    load()
  }, [type, region, category]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ type, regionCode: region, limit: "25" })
    if (category) params.set("categoryId", category)
    const res = await fetch(`/api/trending?${params}`)
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? "Failed to load trending videos")
      setVideos([])
    } else {
      setVideos(data.videos ?? [])
    }
    setLoading(false)
  }

  async function trackChannel(v: VideoItem) {
    setTracking((prev) => new Set(prev).add(v.channelId))
    const res = await fetch("/api/competitors/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: v.channelId, name: v.channelName, thumbnail: null }),
    })
    if (res.ok) {
      setTracked((prev) => new Set(prev).add(v.channelId))
    }
    setTracking((prev) => {
      const next = new Set(prev)
      next.delete(v.channelId)
      return next
    })
  }

  async function askWhyTrending(v: VideoItem) {
    const id = v.youtubeVideoId
    if (aiOpen === id) { setAiOpen(null); return }
    setAiOpen(id)
    if (aiText[id]) return
    setAiLoading(prev => new Set(prev).add(id))
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Why is this YouTube video trending right now? Video title: "${v.title}" by ${v.channelName}. It has ${v.viewCount.toLocaleString()} views. Explain in 2-3 punchy sentences what makes this video click-worthy and why it's getting traction. Be specific and tactical.`
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setAiText(prev => ({ ...prev, [id]: data.error ?? "Something went wrong. Try again." }))
        return
      }
      if (!res.body) { setAiLoading(prev => { const n = new Set(prev); n.delete(id); return n }); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setAiText(prev => ({ ...prev, [id]: full }))
      }
    } finally {
      setAiLoading(prev => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  return (
    <div className="p-8 max-w-6xl" style={{ color: "#fff" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Trending on YouTube</h1>
        <p style={{ color: "#888", fontSize: 14 }}>
          What&apos;s breaking through right now — across all categories.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {(["videos", "shorts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setType(tab)}
            className="px-5 py-2 rounded-lg text-sm font-medium"
            style={{
              background: type === tab ? "#00ff87" : "#1a1a1a",
              color: type === tab ? "#000" : "#888",
              border: `1px solid ${type === tab ? "#00ff87" : "#2a2a2a"}`,
            }}
          >
            {tab === "videos" ? "Videos" : "Shorts"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#ccc" }}
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: category === cat.value ? "#00ff87" : "#1a1a1a",
                color: category === cat.value ? "#000" : "#888",
                border: `1px solid ${category === cat.value ? "#00ff87" : "#2a2a2a"}`,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {!loading && !error && (
          <span style={{ color: "#555", fontSize: 13, marginLeft: "auto" }}>
            {videos.length} video{videos.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ color: "#555", paddingTop: 48, textAlign: "center" }}>Loading…</div>
      ) : error ? (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
          style={{ borderColor: "#2a2a2a", background: "#111" }}
        >
          <p className="font-semibold mb-2" style={{ color: "#ff6666" }}>
            Failed to load trending videos
          </p>
          <p style={{ color: "#555", fontSize: 14 }}>{error}</p>
          {(error.toLowerCase().includes("api") || error.toLowerCase().includes("key")) && (
            <p style={{ color: "#555", fontSize: 13, marginTop: 8 }}>
              Make sure YOUTUBE_API_KEY is set in your environment variables.
            </p>
          )}
        </div>
      ) : videos.length === 0 ? (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
          style={{ borderColor: "#2a2a2a", background: "#111" }}
        >
          <p className="font-semibold mb-1">No videos found</p>
          <p style={{ color: "#555", fontSize: 14 }}>Try a different region or category.</p>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {videos.map((v) => (
            <div
              key={v.youtubeVideoId}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "#2a2a2a", background: "#111" }}
            >
              <a
                href={`https://youtube.com/watch?v=${v.youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="relative"
                  style={{ paddingBottom: "56.25%", background: "#1a1a1a" }}
                >
                  {v.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnailUrl}
                      alt={v.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ color: "#333" }}
                    >
                      ▶
                    </div>
                  )}
                </div>
              </a>

              <div className="p-3">
                <a
                  href={`https://youtube.com/watch?v=${v.youtubeVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <p
                    className="font-medium mb-1 leading-snug"
                    style={{
                      fontSize: 14,
                      color: "#fff",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                    }}
                  >
                    {v.title}
                  </p>
                </a>

                <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{v.channelName}</p>

                <div
                  className="flex items-center gap-3 mb-3"
                  style={{ fontSize: 12, color: "#666" }}
                >
                  <span>👁 {fmt(v.viewCount)}</span>
                  <span>{fmtDate(v.publishedAt)}</span>
                </div>

                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => trackChannel(v)}
                    disabled={tracked.has(v.channelId) || tracking.has(v.channelId)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: tracked.has(v.channelId) ? "#1a1a1a" : "#00ff87",
                      color: tracked.has(v.channelId) ? "#00ff87" : "#000",
                      border: "1px solid #00ff87",
                      cursor: tracked.has(v.channelId) || tracking.has(v.channelId) ? "default" : "pointer",
                      opacity: tracking.has(v.channelId) ? 0.6 : 1,
                    }}
                  >
                    {tracked.has(v.channelId) ? "✓ Tracked" : tracking.has(v.channelId) ? "Tracking…" : "Track Channel"}
                  </button>
                  <button
                    onClick={() => askWhyTrending(v)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black transition-all hover:scale-105"
                    style={{
                      background: aiOpen === v.youtubeVideoId ? "linear-gradient(135deg, #a855f7, #7c3aed)" : "rgba(168,85,247,0.15)",
                      color: aiOpen === v.youtubeVideoId ? "#fff" : "#c084fc",
                      border: "1px solid rgba(168,85,247,0.4)",
                    }}
                  >
                    🧠 AI
                  </button>
                </div>
                {aiOpen === v.youtubeVideoId && (
                  <div className="rounded-xl p-3 mt-1" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-black" style={{ color: "#a855f7" }}>🧠 Why It&apos;s Trending</span>
                    </div>
                    {aiLoading.has(v.youtubeVideoId) && !aiText[v.youtubeVideoId] ? (
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#a855f7", opacity: 0.7 }} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed" style={{ color: "#ccc" }}>{aiText[v.youtubeVideoId]}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
