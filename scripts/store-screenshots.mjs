/**
 * Chrome Web Store screenshot pipeline.
 *
 * Launches Chromium with the unpacked extension from ./extension, signs into
 * the demo account, delivers the API key to the extension via the app's own
 * 1-click connect flow, then captures clean 1280x800 product shots (exact
 * store dimensions, no browser chrome, no personal profile) into
 * extension/store-assets/.
 *
 * Run: node scripts/store-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const EXT = path.resolve("extension");
const OUT = path.resolve("extension/store-assets");
const PROFILE = path.resolve(".playwright-profile");
const DEMO_EMAIL = "demo@tubewatchhq.com";
const DEMO_PASSWORD = "Demo-TubeWatch-2026";

const WATCH_URL = "https://www.youtube.com/watch?v=Sntj4HmuykI"; // Fireship, known outlier
const CHANNEL_URL = "https://www.youtube.com/@fireship/videos";

mkdirSync(OUT, { recursive: true });
rmSync(PROFILE, { recursive: true, force: true });

const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: "chromium",
  headless: true, // new headless supports MV3 extensions via channel: "chromium"
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});

const page = await ctx.newPage();

// ── 1. Sign in to the demo account ──────────────────────────────────────────
await page.goto("https://www.tubewatchhq.com/login", { waitUntil: "networkidle" });
await page.waitForTimeout(1500); // let React hydrate before the handler-bearing click
await page.fill('input[type="email"]', DEMO_EMAIL);
await page.fill('input[type="password"]', DEMO_PASSWORD);
await page.click('button[type="submit"]');
// If hydration still raced us, retry the submit once.
await page.waitForTimeout(4000);
if (/\/login/.test(page.url())) {
  await page.click('button[type="submit"]').catch(() => {});
}
try {
  await page.waitForURL(/dashboard/, { timeout: 30_000 });
} catch (e) {
  console.log("login stuck at:", page.url());
  console.log("page text:", (await page.locator("body").innerText()).slice(0, 500));
  await page.screenshot({ path: path.join(OUT, "debug-login.png") });
  throw e;
}
console.log("signed in");

// ── 2. Deliver the API key to the extension (the app's own 1-click flow) ────
await page.goto("https://www.tubewatchhq.com/settings", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
// Generate the key, verifying the click actually took (hydration can eat the
// first click on a fresh load) — retry until the button disappears.
for (let i = 0; i < 4; i++) {
  const generate = page.getByRole("button", { name: /generate api key/i });
  if (!(await generate.isVisible().catch(() => false))) break;
  await generate.click({ delay: 50 });
  await page.waitForTimeout(3000);
}
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const connect = page.getByRole("button", { name: /connect extension/i });
try {
  await connect.waitFor({ timeout: 15_000 });
} catch (e) {
  await page.screenshot({ path: path.join(OUT, "debug-settings.png") });
  const section = await page.locator("text=/browser extension/i").locator("..").innerText().catch(() => "section not found");
  console.log("settings section:", section.slice(0, 600));
  throw e;
}
await connect.click();
// connect.js receives the key via postMessage, then the app redirects to YouTube
await page.waitForURL(/youtube\.com/, { timeout: 20_000 }).catch(() => {});
console.log("extension connected");

// Dismiss a possible YouTube consent screen, privacy-preserving choice.
const reject = page.getByRole("button", { name: /reject all/i }).first();
if (await reject.isVisible().catch(() => false)) await reject.click();

// ── 3. Shot: channel page — Track button + badge grid ───────────────────────
await page.goto(CHANNEL_URL, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".tw-track-btn", { timeout: 30_000 }).catch(() => {});
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT, "01-channel-track-button.png") });
console.log("shot 01");

// Scroll into the grid so multiple outlier badges are in frame.
await page.mouse.wheel(0, 700);
await page.waitForSelector(".tw-outlier-badge", { timeout: 30_000 }).catch(() => {});
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(OUT, "02-badges-grid.png") });
console.log("shot 02");

// ── 4. Shot: watch page with the live stats panel ───────────────────────────
await page.goto(WATCH_URL, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".tw-watch-panel", { timeout: 30_000 }).catch(() => {});
await page.waitForTimeout(4000);
await page.screenshot({ path: path.join(OUT, "03-watch-panel.png") });
console.log("shot 03");

await ctx.close();
rmSync(PROFILE, { recursive: true, force: true });
console.log(`done → ${OUT}`);
