import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { YoutubeTranscript } from "youtube-transcript";
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

  const { videoId, title, viewCount, outlierScore, channelName, publishedAt } =
    await request.json();

  // Try to fetch transcript — many videos have none, so wrap in try/catch
  let transcriptLine =
    "Transcript: Not available — analyze from title and metadata only.";
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const words = transcript
      .map((seg) => seg.text)
      .join(" ")
      .split(" ");
    const first500 = words.slice(0, 500).join(" ");
    transcriptLine = `Transcript excerpt (first 500 words): ${first500}`;
  } catch {
    // Transcript unavailable — fall back to title/metadata only
  }

  const prompt = `You are a YouTube strategy expert. Analyze why this video massively outperformed its channel average.

Video: "${title}"
Channel: ${channelName}
Views: ${viewCount} (${outlierScore}x the channel's median)
Published: ${publishedAt}
${transcriptLine}

In 3-4 short paragraphs, explain:
1. **The Hook** — what grabbed attention in the title and opening
2. **The Formula** — what content/structural pattern this follows
3. **Why It Spread** — emotional or shareability factors
4. **Steal This** — one concrete thing a creator should copy in their next video

Be specific and tactical, not generic.

Close with "**Your Move:**" — 3 bullets: (1) a specific title formula to steal from this video, (2) the hook structure to copy in their next video, (3) one content angle to test based on this video's success.`;

  const stream = await anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
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
