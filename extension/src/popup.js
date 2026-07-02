/* TubeWatch extension — popup logic. Stores the user's API key in
   chrome.storage.local (which api.js reads), and verifies it against the live
   API so the popup can say plainly whether you're connected. */

const API_BASE = "https://www.tubewatchhq.com";
const keyInput = document.getElementById("key");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("save");

function setStatus(state, msg) {
  statusEl.className = "status " + state; // ok | warn | pending
  statusEl.textContent = msg;
}

// An empty-videoIds request returns 200 for a valid key, 401 for a bad one.
async function verifyKey(key) {
  try {
    const res = await fetch(`${API_BASE}/api/extension/outlier?videoIds=`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    return res.status !== 401;
  } catch {
    return false;
  }
}

async function refresh(key) {
  if (!key) {
    setStatus("warn", "Not connected — showing demo scores.");
    return;
  }
  setStatus("pending", "Checking…");
  const ok = await verifyKey(key);
  setStatus(
    ok ? "ok" : "warn",
    ok ? "✓ Connected — outlier scores are live on YouTube." : "That key isn't valid. Regenerate it in Settings."
  );
}

chrome.storage.local.get(["twApiKey"], (r) => {
  if (r?.twApiKey) keyInput.value = r.twApiKey;
  refresh(r?.twApiKey || null);
});

function save() {
  const value = keyInput.value.trim();
  chrome.storage.local.set({ twApiKey: value }, () => refresh(value));
}

saveBtn.addEventListener("click", save);
keyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") save();
});
