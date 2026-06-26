import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // user_id
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?google_error=access_denied`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${appUrl}/settings?google_error=token_exchange`);
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  // Fetch user's YouTube channel ID from the token
  let youtubeChannelId: string | null = null;
  let email: string | null = null;

  try {
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const channelData = await channelRes.json();
    youtubeChannelId = channelData.items?.[0]?.id ?? null;
  } catch {}

  try {
    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const userData = await userRes.json();
    email = userData.email ?? null;
  } catch {}

  // Store tokens in DB (upsert so reconnecting updates the token)
  const supabase = createClient();
  const { error: dbError } = await supabase
    .from("user_google_tokens")
    .upsert({
      user_id: state,
      access_token,
      refresh_token: refresh_token ?? null,
      expires_at: expiresAt,
      youtube_channel_id: youtubeChannelId,
      email,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (dbError) {
    console.error("DB error saving token:", dbError);
    return NextResponse.redirect(`${appUrl}/settings?google_error=db`);
  }

  return NextResponse.redirect(`${appUrl}/settings?google_connected=1`);
}
