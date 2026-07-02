/**
 * TubeWatch extension — data layer.
 *
 * Content scripts share one isolated-world global scope, so api.js runs before
 * content.js and exposes `globalThis.TubeWatchAPI`. When the user has pasted
 * their API key (Settings → Browser Extension) we fetch real outlier scores
 * from TubeWatch, batching all the thumbnails visible in a tick into a single
 * request. Without a key we fall back to deterministic DEMO scores so the
 * overlay is still visible/positionable.
 */
(function () {
  const API_BASE = "https://www.tubewatchhq.com";
  const BATCH_MS = 250;
  const MAX_BATCH = 50;

  function demoScore(videoId) {
    let h = 0;
    for (let i = 0; i < videoId.length; i++) h = (h * 31 + videoId.charCodeAt(i)) >>> 0;
    return Math.round(((h % 1800) / 100 + 0.4) * 10) / 10;
  }

  function getApiKey() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(["twApiKey"], (r) => resolve(r?.twApiKey || null));
      } catch {
        resolve(null);
      }
    });
  }

  const cache = new Map(); // videoId -> result object
  let queue = new Map(); // videoId -> [resolve, ...]
  let timer = null;

  async function flush() {
    timer = null;
    const pending = queue;
    queue = new Map();

    const apiKey = await getApiKey();
    const ids = [...pending.keys()].slice(0, MAX_BATCH);

    // No key → demo scores for everything.
    if (!apiKey) {
      for (const [id, resolvers] of pending) {
        const result = { score: demoScore(id), demo: true };
        cache.set(id, result);
        resolvers.forEach((fn) => fn(result));
      }
      return;
    }

    let scores = {};
    try {
      const res = await fetch(`${API_BASE}/api/extension/outlier?videoIds=${encodeURIComponent(ids.join(","))}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) scores = (await res.json()).scores ?? {};
    } catch {
      // Network/API failure: resolve as no-score so the badge just doesn't show.
    }

    for (const [id, resolvers] of pending) {
      const row = scores[id];
      const result = row ? { score: row.outlier_score, demo: false, data: row } : { score: null, demo: false };
      cache.set(id, result);
      resolvers.forEach((fn) => fn(result));
    }
  }

  function getOutlierScore(videoId) {
    if (!videoId) return Promise.resolve({ score: null, demo: false });
    if (cache.has(videoId)) return Promise.resolve(cache.get(videoId));
    return new Promise((resolve) => {
      const list = queue.get(videoId) ?? [];
      list.push(resolve);
      queue.set(videoId, list);
      if (!timer) timer = setTimeout(flush, BATCH_MS);
    });
  }

  globalThis.TubeWatchAPI = { getOutlierScore, getApiKey };
})();
