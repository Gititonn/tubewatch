/**
 * TubeWatch extension — watch-page panel (#2).
 *
 * ViewStats injects a stats panel into the right rail of an open video. This
 * does the TubeWatch version: the current video's outlier score plus its core
 * stats (views, likes, comments, views-per-hour, exact publish date), pulled
 * from the same /api/extension/outlier endpoint the badges use. Shows on
 * youtube.com/watch only, and re-renders when you navigate between videos.
 */
(function () {
  const PANEL_ID = "tw-watch-panel";

  function fmt(n) {
    if (n == null) return "—";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function viewsPerHour(views, publishedAt) {
    if (!views || !publishedAt) return null;
    const hours = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
    return Math.round(views / Math.max(hours, 1));
  }

  function scoreColor(score) {
    if (score == null) return "var(--tw-muted, #888)";
    if (score >= 10) return "#f97316";
    if (score >= 5) return "#ffaa00";
    return "#00ff87";
  }

  function currentVideoId() {
    if (location.pathname !== "/watch") return null;
    return new URLSearchParams(location.search).get("v");
  }

  function statCell(label, value) {
    return `<div class="tw-wp-stat"><div class="tw-wp-stat-val">${value}</div><div class="tw-wp-stat-lbl">${label}</div></div>`;
  }

  function render(container, videoId, result) {
    const score = result && result.score != null ? result.score : null;
    const d = (result && result.data) || {};
    const demo = result && result.demo;
    const vph = viewsPerHour(d.view_count, d.published_at);

    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = PANEL_ID;
    }
    // Prepend into the given (visible) container — and move the panel there if it
    // currently lives in a different, stale 0×0 #secondary left over from a SPA
    // navigation. That misplacement was why the sidebar stayed invisible until a
    // hard reload.
    if (panel.parentElement !== container) container.prepend(panel);
    panel.innerHTML = `
      <div class="tw-wp-head">
        <span class="tw-wp-logo">🔥</span>
        <span class="tw-wp-title">TubeWatch</span>
        ${demo ? '<span class="tw-wp-demo">demo</span>' : ""}
      </div>
      <div class="tw-wp-score" style="color:${scoreColor(score)};border-color:${scoreColor(score)}">
        ${score != null ? score.toFixed(1) + "x" : "—"}
        <span class="tw-wp-score-lbl">outlier score</span>
      </div>
      <div class="tw-wp-grid">
        ${statCell("Views", fmt(d.view_count))}
        ${statCell("Likes", fmt(d.like_count))}
        ${statCell("Comments", fmt(d.comment_count))}
        ${statCell("Views/hr", fmt(vph))}
        ${statCell("Published", fmtDate(d.published_at))}
      </div>
      ${!demo && d.youtube_channel_id ? '<button class="tw-wp-track" type="button">＋ Track channel</button>' : ""}
      ${demo ? '<div class="tw-wp-note">Connect your API key in TubeWatch → Settings for live scores &amp; stats.</div>' : ""}
    `;

    const trackBtn = panel.querySelector(".tw-wp-track");
    if (trackBtn) {
      trackBtn.addEventListener("click", async () => {
        trackBtn.disabled = true;
        trackBtn.textContent = "Tracking…";
        const res = await window.TubeWatchAPI.trackChannel({ channelId: d.youtube_channel_id });
        if (res.ok) {
          trackBtn.textContent = "✓ Tracking";
          trackBtn.classList.add("tw-wp-tracking");
        } else {
          trackBtn.disabled = false;
          trackBtn.textContent = res.status === 402 ? "Limit reached — upgrade" : "Track failed — retry";
        }
      });
    }
  }

  let lastVideoId = null;
  let lastResult = null; // cached score for lastVideoId, so re-injection doesn't refetch
  let ensuring = false; // guards against overlapping container-wait timers

  // The right rail (#secondary / #secondary-inner) that we inject into. During a
  // SPA navigation YouTube briefly keeps a *stale* #secondary in the DOM that is
  // collapsed to 0×0, ahead of the live one in document order — so a plain
  // querySelector("#secondary") can hand back the invisible ghost. Pick the
  // first candidate that is actually laid out (non-zero width), preferring
  // #secondary-inner.
  function findContainer() {
    const candidates = [
      ...document.querySelectorAll("#secondary-inner"),
      ...document.querySelectorAll("#secondary"),
    ];
    return candidates.find((el) => el.getBoundingClientRect().width > 0) || null;
  }

  // The panel is only "healthy" if it exists AND has real dimensions. A panel
  // sitting inside a 0×0 stale container counts as broken and must be re-homed.
  function panelHealthy() {
    const p = document.getElementById(PANEL_ID);
    return !!p && p.getBoundingClientRect().width > 0;
  }

  // Keep (re)injecting until the panel is present in a *visible* container. Polls
  // because the rail renders async and can be rebuilt mid-transition; render()
  // moves the panel into the live container if it landed in a ghost.
  function ensurePanel(videoId) {
    if (ensuring) return;
    if (panelHealthy() && videoId === lastVideoId && lastResult) return;
    ensuring = true;
    let tries = 0;
    const timer = setInterval(async () => {
      if (currentVideoId() !== videoId) { // navigated away while waiting
        clearInterval(timer);
        ensuring = false;
        return;
      }
      const container = findContainer();
      if (container) {
        if (!lastResult) lastResult = await window.TubeWatchAPI.getOutlierScore(videoId);
        if (currentVideoId() !== videoId) { clearInterval(timer); ensuring = false; return; }
        render(container, videoId, lastResult);
        if (panelHealthy()) {
          clearInterval(timer);
          ensuring = false;
          return;
        }
      }
      if (++tries > 60) { // ~15s ceiling
        clearInterval(timer);
        ensuring = false;
      }
    }, 250);
  }

  function update() {
    const videoId = currentVideoId();
    if (!videoId) {
      const existing = document.getElementById(PANEL_ID);
      if (existing) existing.remove();
      lastVideoId = null;
      lastResult = null;
      return;
    }
    if (videoId !== lastVideoId) {
      lastVideoId = videoId;
      lastResult = null; // new video — force a fresh fetch
    }
    ensurePanel(videoId);
  }

  // Safety net for YouTube rebuilding/wiping the rail after we've injected. The
  // callback is coalesced to once per frame so the getBoundingClientRect health
  // check doesn't force a reflow on every one of YouTube's many mutations.
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (currentVideoId() && !panelHealthy()) ensurePanel(currentVideoId());
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("yt-navigate-finish", update);

  // Live key connect/disconnect: drop the cached score and re-render.
  window.TubeWatchAPI.onKeyChange?.(() => {
    lastResult = null;
    lastVideoId = null;
    update();
  });

  update();
})();
