/* TubeWatch extension — popup logic. Stores the user's API key in
   chrome.storage.local, which api.js reads on the content side. */

const keyInput = document.getElementById("key");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("save");

function setStatus(connected) {
  statusEl.className = "status " + (connected ? "ok" : "warn");
  statusEl.textContent = connected
    ? "Key saved — live scores enable once the API endpoint ships."
    : "Not connected — showing demo scores.";
}

chrome.storage.local.get(["twApiKey"], (r) => {
  if (r?.twApiKey) {
    keyInput.value = r.twApiKey;
    setStatus(true);
  } else {
    setStatus(false);
  }
});

saveBtn.addEventListener("click", () => {
  const value = keyInput.value.trim();
  chrome.storage.local.set({ twApiKey: value }, () => setStatus(!!value));
});
