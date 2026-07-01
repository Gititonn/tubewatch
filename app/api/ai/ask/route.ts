import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plan";
import { consumeAiCall } from "@/lib/entitlements";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await consumeAiCall(supabase, user.id, await getUserPlan(supabase, user.id));
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { question } = await request.json();

  if (!question?.trim()) {
    return NextResponse.json({ error: "No question provided" }, { status: 400 });
  }

  const system = `You are the TubeWatch AI Engine — a YouTube growth strategist for GROWING creators (roughly 1K–100K subscribers) who are serious about the channel but don't have a large audience, budget, or team. Assume the creator is starting from modest authority and limited reach, and cannot rely on an existing fanbase or paid promotion to carry a video. Their single most valuable question is "what should I make next?"

Your core move is to reason from what's already WINNING in the creator's niche — the outlier videos (ones pulling views far faster than a channel's norm) they and their competitors have produced — and turn those patterns into the creator's next upload.

Your expertise is the high-leverage stuff that works without clout:
- Reverse-engineering why a specific outlier video overperformed (packaging, angle, timing) and how to adapt it
- Thumbnail psychology and packaging that wins clicks for smaller channels
- Title / hook optimization for click-through and retention
- Organic discovery: searchable topics, SEO, suggested-feed and "borrowed authority" formats
- Editing and retention tricks that punch above the creator's subscriber count
- Content formats and series that compound over time

Rules:
- Be direct, tactical, and specific. Never give filler advice like "post consistently" or "engage your audience."
- Bias toward concrete next-video ideas the creator can film, grounded in proven niche patterns.
- Keep it to 3–5 sentences or short paragraphs. Reference concrete patterns, structures, or examples.
- End with a "**Your Move:**" section containing exactly 2–3 bullets — each a specific task the creator can do THIS WEEK. Format each as "• [specific action]".`;

  const stream = await anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system,
    messages: [{ role: "user", content: question }],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
