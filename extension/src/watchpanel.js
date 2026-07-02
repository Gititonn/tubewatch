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
    if (score >= 10) return "#ff4444";
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
      container.prepend(panel);
    }
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
      ${demo ? '<div class="tw-wp-note">Connect your API key in TubeWatch → Settings for live scores &amp; stats.</div>' : ""}
    `;
  }

  let lastVideoId = null;

  async function update() {
    const videoId = currentVideoId();
    if (!videoId) {
      const existing = document.getElementById(PANEL_ID);
      if (existing) existing.remove();
      lastVideoId = null;
      return;
    }
    if (videoId === lastVideoId && document.getElementById(PANEL_ID)) return;
    lastVideoId = videoId;

    // Wait for the right rail to exist (it renders async).
    let tries = 0;
    const timer = setInterval(async () => {
      const container = document.querySelector("#secondary-inner, #secondary");
      if (container) {
        clearInterval(timer);
        const result = await window.TubeWatchAPI.getOutlierScore(videoId);
        // guard against a navigation that happened while we awaited
        if (currentVideoId() === videoId) render(container, videoId, result);
      } else if (++tries > 40) {
        clearInterval(timer);
      }
    }, 250);
  }

  window.addEventListener("yt-navigate-finish", update);
  update();
})();
