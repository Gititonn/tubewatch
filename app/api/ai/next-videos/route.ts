import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { getChannelAnalytics } from "@/lib/channel-lookup";
import {
  buildNextVideosPrompt,
  parseIdeas,
  NEXT_VIDEOS_MODEL,
  type NextVideoIdea,
  type IdeaSeedVideo,
} from "@/lib/next-videos";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Anonymous, un-gated endpoint (the /channel front-door magic). Cost is held
// down two ways: results are cached per channel for CACHE_TTL, and cache-MISS
// generations are capped per IP per day. A crawler enumerating channels burns
// its daily budget fast; a human revisiting the same channel pays nothing.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DAILY_IP_LIMIT = 25; // cache-miss generations per IP per UTC day

// A breakout worth borrowing must clear its own channel's normal pace by a
// clear margin; below this it's just an average upload.
const BREAKOUT_MIN_SCORE = 1.5;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  let handle = "";
  try {
    const body = await request.json();
    handle = String(body?.handle ?? "").trim().replace(/^@/, "");
  } catch {
    /* fall through to the empty-handle guard */
  }
  if (!handle) {
    return NextResponse.json({ error: "Missing channel handle" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const svc = createServiceClient();

  // Resolve the channel first so the cache key is the stable youtube_channel_id
  // (not a handle the user may have typed inconsistently).
  const analytics = await getChannelAnalytics(handle);
  if (!analytics.found) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }
  const { channel, videos } = analytics;

  // ── Cache hit? Serve it, no AI call, no rate-limit charge. ────────────────
  const { data: cached } = await svc
    .from("channel_next_ideas")
    .select("ideas, created_at")
    .eq("youtube_channel_id", channel.youtube_channel_id)
    .maybeSingle();

  if (cached && Date.now() - new Date(cached.created_at).getTime() < CACHE_TTL_MS) {
    return NextResponse.json({ ideas: cached.ideas as NextVideoIdea[], cached: true });
  }

  // ── Cache miss → rate-limit this IP before spending on generation. ────────
  const ip = clientIp(request);
  const today = new Date().toISOString().slice(0, 10);
  const { data: rate } = await svc
    .from("public_ai_rate")
    .select("count")
    .eq("ip", ip)
    .eq("day", today)
    .maybeSingle();
  if ((rate?.count ?? 0) >= DAILY_IP_LIMIT) {
    // If we have a stale cached set, still hand it back rather than a hard wall.
    if (cached) {
      return NextResponse.json({ ideas: cached.ideas as NextVideoIdea[], cached: true });
    }
    return NextResponse.json(
      { error: "Daily free limit reached — sign up to keep generating." },
      { status: 429 }
    );
  }

  // ── Build the seed sets from the channel's own videos. ────────────────────
  const toSeed = (v: (typeof videos)[number]): IdeaSeedVideo => ({
    title: v.title,
    outlier_score: v.outlier_score,
    view_count: v.view_count,
    duration_seconds: v.duration_seconds,
  });
  const breakouts = videos
    .filter((v) => (v.outlier_score ?? 0) >= BREAKOUT_MIN_SCORE)
    .slice(0, 5)
    .map(toSeed);
  // Baseline = videos closest to a 1.0x score (the channel's normal lane).
  const baseline = [...videos]
    .filter((v) => v.outlier_score != null)
    .sort((a, b) => Math.abs((a.outlier_score ?? 1) - 1) - Math.abs((b.outlier_score ?? 1) - 1))
    .slice(0, 4)
    .map(toSeed);

  const prompt = buildNextVideosPrompt({
    channelName: channel.title,
    breakouts,
    baseline,
  });

  // Instantiated inside the handler (never module scope) — SSR/build safety.
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let ideas: NextVideoIdea[] = [];
  try {
    const msg = await anthropic.messages.create({
      model: NEXT_VIDEOS_MODEL,
      max_tokens: 900,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    ideas = parseIdeas(text);
  } catch (e) {
    console.warn("next-videos generation failed:", (e as Error).message);
    return NextResponse.json({ error: "Could not generate ideas right now." }, { status: 502 });
  }

  if (ideas.length === 0) {
    return NextResponse.json({ error: "Could not generate ideas right now." }, { status: 502 });
  }

  // ── Persist: cache the result, and charge the IP one generation. ──────────
  await svc.from("channel_next_ideas").upsert(
    {
      youtube_channel_id: channel.youtube_channel_id,
      handle: channel.handle ?? handle,
      channel_title: channel.title,
      ideas,
      model: NEXT_VIDEOS_MODEL,
      created_at: new Date().toISOString(),
    },
    { onConflict: "youtube_channel_id" }
  );
  await svc.from("public_ai_rate").upsert(
    { ip, day: today, count: (rate?.count ?? 0) + 1 },
    { onConflict: "ip,day" }
  );

  return NextResponse.json({ ideas, cached: false });
}
