"use client"
import { MarkdownContent } from "@/components/MarkdownContent";
import { VideoGridSkeleton } from "@/components/Skeleton";
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

// Creator-niche filters. Values are YouTube videoCategoryIds; Finance maps to
// Education (27), the closest assignable category YouTube exposes for it.
const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Tech", value: "28" },
  { label: "Gaming", value: "20" },
  { label: "Finance", value: "27" },
  { label: "DIY/How-To", value: "26" },
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
    <div className="p-8 max-w-6xl" style={{ color: "var(--text-primary)" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Trending on YouTube</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
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
              background: type === tab ? "#00ff87" : "var(--bg-card)",
              color: type === tab ? "#000" : "var(--text-secondary)",
              border: `1px solid ${type === tab ? "#00ff87" : "var(--border)"}`,
            }}
          >
            {tab === "videos" ? "Videos" : "Shorts"}
          </button>
        ))}
      </div>

      {/* Niche filter — the primary way creators narrow trending to their lane */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Filter by niche
          </span>
          <div className="flex items-center gap-3">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {!loading && !error && (
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                {videos.length} video{videos.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className="px-4 py-2 rounded-full text-sm font-bold transition-all hover:scale-[1.03]"
              style={{
                background: category === cat.value ? "#00ff87" : "var(--bg-card)",
                color: category === cat.value ? "#000" : "var(--text-secondary)",
                border: `1px solid ${category === cat.value ? "#00ff87" : "var(--border)"}`,
                boxShadow: category === cat.value ? "0 0 16px rgba(0,255,135,0.25)" : "none",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <VideoGridSkeleton count={8} />
      ) : error ? (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        >
          <p className="font-semibold mb-2" style={{ color: "#fca5a5" }}>
            Failed to load trending videos
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{error}</p>
          {(error.toLowerCase().includes("api") || error.toLowerCase().includes("key")) && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
              Make sure YOUTUBE_API_KEY is set in your environment variables.
            </p>
          )}
        </div>
      ) : videos.length === 0 ? (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        >
          <p className="font-semibold mb-1">No videos found</p>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Try a different region or category.</p>
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
              style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
            >
              <a
                href={`https://youtube.com/watch?v=${v.youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="relative"
                  style={{ paddingBottom: "56.25%", background: "var(--bg-card)" }}
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
                      style={{ color: "var(--text-muted)" }}
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
                      color: "var(--text-primary)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                    }}
                  >
                    {v.title}
                  </p>
                </a>

                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{v.channelName}</p>

                <div
                  className="flex items-center gap-3 mb-3"
                  style={{ fontSize: 12, color: "var(--text-secondary)" }}
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
                      background: tracked.has(v.channelId) ? "var(--bg-card)" : "#00ff87",
                      color: tracked.has(v.channelId) ? "#4ade80" : "#000",
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
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}><MarkdownContent content={aiText[v.youtubeVideoId]} /></div>
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
