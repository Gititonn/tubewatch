import { createClient } from "@/lib/supabase/server";

interface GoogleToken {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  youtube_channel_id: string | null;
}

/**
 * Get a valid access token for the current user, refreshing if expired.
 */
export async function getGoogleToken(userId: string): Promise<string | null> {
  const supabase = createClient();

  const { data: row } = await supabase
    .from("user_google_tokens")
    .select("access_token, refresh_token, expires_at, youtube_channel_id")
    .eq("user_id", userId)
    .single();

  if (!row) return null;

  const token = row as GoogleToken;

  // Check if token is still valid (with 60s buffer)
  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  const isExpired = Date.now() > expiresAt - 60_000;

  if (!isExpired) return token.access_token;

  // Token expired — refresh it
  if (!token.refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("Token refresh failed:", await res.text());
    return null;
  }

  const data = await res.json();
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // Save refreshed token
  await supabase
    .from("user_google_tokens")
    .update({
      access_token: data.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return data.access_token;
}
