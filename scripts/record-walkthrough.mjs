/**
 * Product walkthrough recorder.
 *
 * Records a headless 1280x800 walkthrough of the core loop on the demo
 * account — dashboard → Breakouts → live AI teardown → Rising — and saves
 * stills of each money screen along the way. Output lands in marketing/raw/
 * (webm video + png stills); convert with Playwright's bundled ffmpeg.
 *
 * Run: node scripts/record-walkthrough.mjs
 * NOTE: spends 1 demo-account AI credit on the teardown scene.
 */
import { chromium } from "playwright";
import { mkdirSync, rmSync, readdirSync, renameSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("marketing/raw");
const PROFILE = path.resolve(".playwright-profile");
const DEMO_EMAIL = "demo@tubewatchhq.com";
const DEMO_PASSWORD = "Demo-TubeWatch-2026";

mkdirSync(OUT, { recursive: true });
rmSync(PROFILE, { recursive: true, force: true });

const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: "chromium",
  headless: true,
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
});

const page = await ctx.newPage();
const still = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
// Human-feeling pacing between beats so the cut has breathing room.
const beat = (ms = 2500) => page.waitForTimeout(ms);

// ── Scene 1: sign in ─────────────────────────────────────────────────────────
await page.goto("https://www.tubewatchhq.com/login", { waitUntil: "networkidle" });
await beat(1500);
await page.fill('input[type="email"]', DEMO_EMAIL);
await beat(800);
await page.fill('input[type="password"]', DEMO_PASSWORD);
await beat(800);
await page.click('button[type="submit"]');
await page.waitForTimeout(4000);
if (/\/login/.test(page.url())) await page.click('button[type="submit"]').catch(() => {});
await page.waitForURL(/dashboard/, { timeout: 30_000 });

// ── Scene 2: dashboard tour ──────────────────────────────────────────────────
await page.waitForTimeout(3500);
await still("01-dashboard-top");
await page.mouse.wheel(0, 420); // Getting Started + breakouts widget
await beat(3000);
await still("02-dashboard-breakouts");
await page.mouse.wheel(0, 500); // view trends / AI engine
await beat(2500);
await page.mouse.wheel(0, -920); // back to top for a clean transition
await beat(1500);

// ── Scene 3: Breakouts feed ──────────────────────────────────────────────────
await page.goto("https://www.tubewatchhq.com/competitors/outliers", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);
await still("03-breakouts-feed");
await page.mouse.wheel(0, 350);
await beat(2500);

// ── Scene 4: the AI teardown (spends 1 credit) ───────────────────────────────
const whyBtn = page.getByRole("button", { name: /why did this break out/i }).first();
await whyBtn.waitFor({ timeout: 20_000 });
await whyBtn.scrollIntoViewIfNeeded();
await beat(1200);
await whyBtn.click();
// Let the streamed analysis render on camera.
await page.waitForTimeout(14_000);
await still("04-ai-teardown");
await page.mouse.wheel(0, 300); // scroll within/past the output
await beat(4000);

// ── Scene 5: Rising ──────────────────────────────────────────────────────────
await page.goto("https://www.tubewatchhq.com/rising", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);
await still("05-rising");
await beat(2500);

await ctx.close(); // flushes the video file

// Playwright names videos with a hash — rename to something meaningful.
const vid = readdirSync(OUT).find((f) => f.endsWith(".webm"));
if (vid) renameSync(path.join(OUT, vid), path.join(OUT, "walkthrough.webm"));
rmSync(PROFILE, { recursive: true, force: true });
console.log(`done → ${OUT}`);
