import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, isPaidPlan } from "@/lib/plan";

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
  if (!isPaidPlan(plan)) {
    const { count } = await supabase
      .from("competitor_channels")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= 1) {
      return NextResponse.json(
        { error: "Free plan is limited to 1 competitor channel. Upgrade to Pro for unlimited." },
        { status: 402 }
      );
    }
  }

  const body = await request.json();
  const { channelId, name, handle, thumbnail, subscriberCount, videoCount } = body;

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
      },
      { onConflict: "user_id,youtube_channel_id" }
    )
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
