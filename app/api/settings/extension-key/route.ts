import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-user browser-extension API key (auth model chosen for the extension).
 * GET returns the caller's current key (or null); POST generates a fresh one,
 * replacing any existing key (rotation). The key is shown once in Settings and
 * pasted into the extension popup.
 */

export const dynamic = "force-dynamic";

function newKey(): string {
  return "tw_" + randomBytes(24).toString("hex"); // tw_ + 48 hex chars
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("extension_api_key")
    .eq("id", user.id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ apiKey: data?.extension_api_key ?? null });
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Retry a couple of times on the (astronomically unlikely) UNIQUE collision.
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const apiKey = newKey();
    const { error } = await supabase
      .from("profiles")
      .update({ extension_api_key: apiKey })
      .eq("id", user.id);
    if (!error) return NextResponse.json({ apiKey });
    lastError = error.message;
  }
  return NextResponse.json({ error: lastError ?? "Could not generate key" }, { status: 500 });
}
