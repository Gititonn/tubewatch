/**
 * TubeWatch extension — content script.
 *
 * Runs on youtube.com and (1) overlays an outlier badge on every video
 * thumbnail, (2) adds a "Track on TubeWatch" button on channel pages. YouTube
 * is a SPA that lazy-loads thumbnails, so we scan on load, on every DOM
 * mutation, and on YouTube's own `yt-navigate-finish` route event.
 */
(function () {
  const BADGE_CLASS = "tw-outlier-badge";
  const PROCESSED = "data-tw-processed";

  function scoreColor(score) {
    if (score >= 10) return "#ff4444";
    if (score >= 5) return "#ffaa00";
    return "#00ff87";
  }

  function videoIdFromHref(href) {
    if (!href) return null;
    const m = href.match(/[?&]v=([^&]+)/);
    return m ? m[1] : null;
  }

  async function decorateThumb(anchor) {
    if (!anchor || anchor.getAttribute(PROCESSED)) return;
    anchor.setAttribute(PROCESSED, "1");

    const videoId = videoIdFromHref(anchor.getAttribute("href") || anchor.href);
    if (!videoId) return;

    const { score, demo } = await window.TubeWatchAPI.getOutlierScore(videoId);
    if (score == null) return;

    // The thumbnail anchor needs a positioning context for the absolute badge.
    if (getComputedStyle(anchor).position === "static") anchor.style.position = "relative";

    const badge = document.createElement("div");
    badge.className = BADGE_CLASS + (demo ? " tw-demo" : "");
    badge.style.setProperty("--tw-color", scoreColor(score));
    badge.textContent = `🔥 ${score.toFixed(1)}x`;
    badge.title = demo
      ? "TubeWatch demo score — add your API key to enable live outlier scores"
      : "TubeWatch outlier score (age-adjusted vs. channel median)";
    anchor.appendChild(badge);
  }

  // ---- channel-page "Track on TubeWatch" button ----
  function isChannelPage() {
    return /^\/(channel\/|@|c\/|user\/)/.test(location.pathname);
  }

  function maybeInjectChannelTrack() {
    if (!isChannelPage() || document.querySelector(".tw-track-btn")) return;
    const actions = document.querySelector(
      "yt-flexible-actions-view-model, #inner-header-container #buttons, ytd-c4-tabbed-header-renderer #buttons"
    );
    if (!actions) return;

    const btn = document.createElement("button");
    btn.className = "tw-track-btn";
    btn.textContent = "＋ Track on TubeWatch";
    btn.addEventListener("click", () => {
      // v1: deep-link into TubeWatch's competitors flow. A direct one-click add
      // via the API awaits the auth decision (see README.md).
      const handle = location.pathname.replace(/^\//, "");
      window.open(`https://www.tubewatchhq.com/competitors?add=${encodeURIComponent(handle)}`, "_blank");
    });
    actions.prepend(btn);
  }

  function scan(root) {
    (root || document)
      .querySelectorAll(`a#thumbnail[href*="/watch?v="]:not([${PROCESSED}])`)
      .forEach(decorateThumb);
    maybeInjectChannelTrack();
  }

  // ---- observe SPA navigation + lazy loading ----
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('a#thumbnail[href*="/watch?v="]')) decorateThumb(node);
        else if (node.querySelectorAll) scan(node);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("yt-navigate-finish", () => setTimeout(() => scan(document), 300));
  scan(document);
})();
