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

  // YouTube renders thumbnails through two architectures: the older
  // ytd-thumbnail (a#thumbnail) and the newer view-model lockups
  // (a.ytLockupViewModelContentImage — used on watch-page recommendations, and
  // increasingly the home feed and search). Match both, or badges silently
  // stop appearing when YouTube ships the new components.
  const THUMB_SELECTOR =
    'a#thumbnail[href*="/watch?v="], a.ytLockupViewModelContentImage[href*="/watch?v="]';

  function scoreColor(score) {
    if (score >= 10) return "#ff4444";
    if (score >= 5) return "#ffaa00";
    return "#00ff87";
  }

  function fmtCount(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
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

    const { score, demo, data } = await window.TubeWatchAPI.getOutlierScore(videoId);
    if (score == null) return;

    // The thumbnail anchor needs a positioning context for the absolute badge.
    if (getComputedStyle(anchor).position === "static") anchor.style.position = "relative";

    const badge = document.createElement("div");
    badge.className = BADGE_CLASS + (demo ? " tw-demo" : "");
    badge.style.setProperty("--tw-color", scoreColor(score));
    // Show the real view count next to our derived multiplier, so the score is
    // always displayed alongside the underlying API metric (YouTube API ToS
    // §III.E.4.h). Demo badges have no real data, so they show the score only.
    const views = data && data.view_count != null ? fmtCount(data.view_count) : null;
    badge.innerHTML =
      `<span class="tw-badge-score">🔥 ${score.toFixed(1)}x</span>` +
      (views ? `<span class="tw-badge-views">${views}</span>` : "");
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
    btn.addEventListener("click", async () => {
      const handle = location.pathname.replace(/^\//, "").split("/")[0];
      btn.disabled = true;
      btn.textContent = "Tracking…";
      const res = await window.TubeWatchAPI.trackChannel({ handle });
      if (res.ok) {
        btn.textContent = "✓ Tracking";
      } else if (res.error === "no-key") {
        btn.textContent = "Add API key first";
        window.open("https://www.tubewatchhq.com/settings", "_blank");
      } else {
        btn.disabled = false;
        btn.textContent = res.status === 402 ? "Limit reached — upgrade" : "Track failed — retry";
      }
    });
    actions.prepend(btn);
  }

  function scan(root) {
    (root || document).querySelectorAll(THUMB_SELECTOR).forEach(decorateThumb);
    maybeInjectChannelTrack();
  }

  // ---- observe SPA navigation + lazy loading ----
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.(THUMB_SELECTOR)) decorateThumb(node);
        else if (node.querySelectorAll) scan(node);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("yt-navigate-finish", () => setTimeout(() => scan(document), 300));

  // When the API key is connected/changed mid-session, wipe existing badges and
  // their processed markers, then re-scan so demo badges upgrade to real scores
  // (or the reverse on disconnect) without a page reload.
  window.TubeWatchAPI.onKeyChange?.(() => {
    document.querySelectorAll("." + BADGE_CLASS).forEach((b) => b.remove());
    document.querySelectorAll("[" + PROCESSED + "]").forEach((el) => el.removeAttribute(PROCESSED));
    scan(document);
  });

  scan(document);
})();
