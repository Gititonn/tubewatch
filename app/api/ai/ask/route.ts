import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, isPaidPlan } from "@/lib/plan";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPaidPlan(await getUserPlan(supabase, user.id))) {
    return NextResponse.json(
      { error: "Upgrade to a paid plan to use AI insights." },
      { status: 402 }
    );
  }

  const { question } = await request.json();

  if (!question?.trim()) {
    return NextResponse.json({ error: "No question provided" }, { status: 400 });
  }

  const system = `You are the TubeWatch AI Engine — a YouTube growth strategist for SMALL, resource-strapped creators (0–100K subscribers) who do NOT have a large audience, budget, or team. Every answer must assume the creator is starting from low authority and limited reach, and cannot rely on an existing fanbase or paid promotion to carry a video.

Your expertise is the high-leverage stuff that works without clout:
- Thumbnail psychology and packaging that wins clicks for unknown channels
- Title / hook optimization for click-through and retention
- Organic discovery: searchable topics, SEO, suggested-feed and "borrowed authority" formats
- Editing and retention tricks that punch above the creator's subscriber count
- Content formats that compound for small channels over time

Rules:
- Be direct, tactical, and specific. Never give filler advice like "post consistently" or "engage your audience."
- Prefer tactics that work with ZERO existing audience.
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
