# TubeWatch Browser Extension (v0.1 — vertical slice)

Overlays TubeWatch's age-adjusted **outlier scores** on YouTube video
thumbnails and adds a **"Track on TubeWatch"** button on channel pages —
bringing the core differentiator into the native YouTube browsing experience
(the ViewStats-style overlay idea).

This is an isolated slice: it lives entirely in `extension/` and touches
nothing in the Next.js app, the database, or production.

## Load it (Chrome / Edge, unpacked)

1. Go to `chrome://extensions`
2. Toggle **Developer mode** (top-right)
3. Click **Load unpacked** and select this `extension/` folder
4. Open `https://www.youtube.com` — 🔥 badges appear on thumbnails; open any
   channel page to see the **Track on TubeWatch** button
5. Click the toolbar icon for the popup (status + API-key field)

## What works now

- **Outlier badges** on every video thumbnail across home / search / channel /
  sidebar, color-coded (green <5x, amber 5–10x, red ≥10x), robust to YouTube's
  SPA navigation and lazy loading (`MutationObserver` + `yt-navigate-finish`).
- **Track on TubeWatch** button on channel pages (deep-links into the
  competitors flow for now).
- **Popup** to store a per-user API key in `chrome.storage.local`.

## What's stubbed (the one decision that unblocks "live")

Scores are currently **demo values** (deterministic per video id) — see the
`DEMO = true` flag in `src/api.js`. The badge/injection/popup code is final and
reused as-is once live; only the data source is stubbed.

To go live we need **one architectural decision — the auth model** — then two
small pieces of backend:

1. **Auth (recommended: per-user API key).** Issue a key in TubeWatch Settings,
   the popup already stores it. Alternatives: shared login cookie, or the
   extension calling YouTube directly (loses outlier scores — they need the
   channel median from TubeWatch's engine).
2. **`GET /api/extension/outlier?videoId=…`** — authenticated endpoint returning
   `{ outlier_score }` (reusing `lib/outlier.ts`), plus per-key rate limiting.
3. Flip `DEMO = false` in `src/api.js`.

The `content_scripts` + `host_permissions` for `tubewatchhq.com` are already in
`manifest.json`, so the live fetch path needs no manifest change.

## Files

```
extension/
  manifest.json      MV3 manifest
  src/
    api.js           data layer (getOutlierScore) — the live-API seam
    content.js       badge + track-button injection, SPA-aware
    content.css      on-page styling (tw- namespaced)
    popup.html/.js/.css  API-key + status popup
```

## Watch-page panel

On a `youtube.com/watch` page, a **TubeWatch panel** is injected at the top of
the right rail (like ViewStats): the video's outlier score plus views, likes,
comments, views-per-hour, and exact publish date — from the same
`/api/extension/outlier` endpoint. See `src/watchpanel.js`. Re-renders on
navigation between videos; shows a "demo" state until an API key is set.

## Not yet included

- Toolbar icons (Chrome shows a default; add `icons/` + `action.default_icon`
  before publishing).
- Chrome Web Store packaging.
