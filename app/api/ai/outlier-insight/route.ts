import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { videoId, channelId } = await request.json();

  const [{ data: video }, { data: allVideos }] = await Promise.all([
    supabase.from("videos").select("*").eq("id", videoId).single(),
    supabase.from("videos").select("view_count,like_count,comment_count").eq("channel_id", channelId),
  ]);

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const totalVideos = allVideos?.length ?? 0;
  const avgViews = totalVideos
    ? Math.round((allVideos ?? []).reduce((s, v) => s + (v.view_count ?? 0), 0) / totalVideos)
    : 0;
  const avgLikes = totalVideos
    ? Math.round((allVideos ?? []).reduce((s, v) => s + (v.like_count ?? 0), 0) / totalVideos)
    : 0;

  const prompt = `You are a YouTube growth analyst. Analyze why this video over- or under-performed vs the channel average.

Video title: "${video.title}"
Published: ${video.published_at ? new Date(video.published_at).toDateString() : "unknown"}
Views: ${video.view_count.toLocaleString()} (channel avg: ${avgViews.toLocaleString()})
Likes: ${video.like_count.toLocaleString()} (channel avg: ${avgLikes.toLocaleString()})
Outlier score: ${video.outlier_score}× (>2 = overperformer, <0.5 = underperformer)

In 2-3 concise sentences, explain what likely caused this video's ${
    (video.outlier_score ?? 1) > 1 ? "strong" : "weak"
  } performance. Consider: title hooks, topic relevance, timing, video format, and engagement signals. Be specific and actionable.`;

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
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
