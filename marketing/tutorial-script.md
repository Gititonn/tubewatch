# Tutorial voiceover — 56s walkthrough

**Footage:** `marketing/raw/walkthrough.mp4` (1280×800, 55.8s, silent)
**Regenerate footage:** `node scripts/record-walkthrough.mjs` (spends 1 demo AI credit)
**Record VO:** OBS (already installed) playing the mp4 while reading this aloud, or feed
the script to an AI voice (ElevenLabs) and mux: `ffmpeg -i walkthrough.mp4 -i vo.mp3 -c:v copy -map 0:v -map 1:a out.mp4`

Timings are approximate — nudge ±1s to taste. ~130 words ≈ natural pace for 56s.

---

**[0:00–0:09 — login fills itself in]**
> This is TubeWatch. It answers one question: what should your next video be?

**[0:09–0:23 — dashboard, scrolling past Getting Started + Breakouts This Week]**
> Connect your channel and it's already working — it auto-tracks competitors your size,
> in your niche, and pulls in their breakouts. These scores aren't view counts —
> that's how many times faster a video is growing than its own channel's normal.

**[0:23–0:33 — Breakouts feed, filters, scrolling the grid]**
> The Breakouts feed is the whole game. Every video here is overperforming its channel
> right now — filter by niche, by multiplier, or search a topic.

**[0:33–0:52 — teardown clicks, analysis streams in]**
> Found one worth copying? Ask the AI why it broke out. It compares the video against
> that channel's own baseline — the title angle, the length, the hook — and tells you
> whether to copy the topic fast, or steal the format forever.

**[0:52–0:56 — Rising page]**
> That's TubeWatch. Free to start — link below.

---

## Where to use the assets

- `walkthrough.mp4` — landing page `<video>` embed, Reddit comments, YouTube (unlisted) for
  linking anywhere.
- Stills (`01`–`05` in marketing/raw): `04-ai-teardown.png` is the proof shot for Reddit;
  `03-breakouts-feed.png` for "what it looks like"; `01` for onboarding docs.
- Re-record after UI changes — the script survives copy tweaks (role/label-based selectors).
