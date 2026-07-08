import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe — no login required (CAN-SPAM / List-Unsubscribe).
 * Flips weekly_email_enabled off for the profile owning the token, then
 * renders a tiny confirmation page. An unknown token still shows a neutral
 * confirmation (never leak whether a token is valid).
 */
function page(body: string): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TubeWatch</title></head>
<body style="margin:0;background:#0f0f0f;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
<div style="max-width:440px;margin:14vh auto;padding:0 20px;text-align:center;">
  <div style="font-size:22px;font-weight:900;margin-bottom:18px;">Tube<span style="color:#00ff87;">Watch</span></div>
  ${body}
  <div style="margin-top:24px;"><a href="https://www.tubewatchhq.com/settings" style="color:#00ff87;font-size:14px;">Manage email preferences</a></div>
</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return page(`<p style="color:#9CA3AF;font-size:15px;">Invalid unsubscribe link.</p>`);
  }

  const svc = createServiceClient();
  await svc
    .from("profiles")
    .update({ weekly_email_enabled: false })
    .eq("weekly_email_token", token);

  return page(
    `<p style="font-size:16px;">You've been unsubscribed from weekly breakout emails.</p>
     <p style="color:#9CA3AF;font-size:14px;">You can turn them back on any time from your settings.</p>`
  );
}
