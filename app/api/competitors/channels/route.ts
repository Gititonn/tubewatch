import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/plan";
import { planLimits } from "@/lib/entitlements";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: channels, error } = await supabase
    .from("competitor_channels")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ channels });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await getUserPlan(supabase, user.id);
  const limit = planLimits(plan).competitorLimit;
  const { count } = await supabase
    .from("competitor_channels")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      {
        error: `Your plan allows up to ${limit} competitor channel${limit === 1 ? "" : "s"}. Upgrade to track more.`,
      },
      { status: 402 }
    );
  }

  const body = await request.json();
  const { channelId, name, handle, thumbnail, subscriberCount, videoCount, category } = body;

  if (!channelId || !name) {
    return NextResponse.json({ error: "Missing channelId or name" }, { status: 400 });
  }

  const { data: channel, error } = await supabase
    .from("competitor_channels")
    .upsert(
      {
        user_id: user.id,
        youtube_channel_id: channelId,
        channel_name: name,
        channel_handle: handle ?? null,
        thumbnail_url: thumbnail ?? null,
        subscriber_count: subscriberCount ?? null,
        video_count: videoCount ?? null,
        category: category ?? "other",
      },
      { onConflict: "user_id,youtube_channel_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ channel });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, category } = await request.json();
  if (!id || !category) {
    return NextResponse.json({ error: "Missing id or category" }, { status: 400 });
  }

  const { data: channel, error } = await supabase
    .from("competitor_channels")
    .update({ category })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ channel });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("competitor_channels")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
