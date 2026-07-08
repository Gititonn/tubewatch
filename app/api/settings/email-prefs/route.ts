import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { weeklyEmailEnabled } = await request.json();
  if (typeof weeklyEmailEnabled !== "boolean") {
    return NextResponse.json({ error: "weeklyEmailEnabled must be a boolean" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ weekly_email_enabled: weeklyEmailEnabled })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, weeklyEmailEnabled });
}
