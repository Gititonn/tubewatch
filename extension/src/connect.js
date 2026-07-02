/**
 * TubeWatch extension — 1-click connect bridge.
 *
 * Runs only on tubewatchhq.com. The Settings page posts the user's API key via
 * window.postMessage; this content script (same DOM, isolated world) receives
 * it, stores it in chrome.storage.local, and posts a confirmation back so the
 * page can show "connected". No copy-paste, no extension-ID handshake.
 *
 * The key is the user's own, already shown in plaintext on their authenticated
 * Settings page, and we accept it only from that exact origin.
 */
(function () {
  const ORIGIN = "https://www.tubewatchhq.com";

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== ORIGIN) return;
    const msg = event.data;
    if (!msg || msg.source !== "tubewatch-web") return;

    if (msg.type === "ping") {
      window.postMessage({ source: "tubewatch-extension", type: "present" }, ORIGIN);
      return;
    }

    if (msg.type === "connect-extension" && typeof msg.apiKey === "string" && msg.apiKey) {
      try {
        chrome.storage.local.set({ twApiKey: msg.apiKey }, () => {
          window.postMessage({ source: "tubewatch-extension", type: "connected" }, ORIGIN);
        });
      } catch {
        /* storage unavailable — page falls back to manual paste */
      }
    }
  });

  // Announce presence on load so the page can reveal the 1-click option.
  window.postMessage({ source: "tubewatch-extension", type: "present" }, ORIGIN);
})();
