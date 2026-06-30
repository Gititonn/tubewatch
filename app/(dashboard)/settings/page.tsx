import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import GoogleConnectButton from "./GoogleConnectButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: googleToken } = await supabase
    .from("user_google_tokens")
    .select("email, youtube_channel_id, updated_at")
    .eq("user_id", user!.id)
    .single();

  const isPro = profile?.plan === "pro";
  const isGoogleConnected = !!googleToken;

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {/* Account */}
      <section
        className="rounded-xl border p-6 mb-4"
        style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555" }}>
          Account
        </h2>
        <div className="text-white text-sm">{user?.email}</div>
      </section>

      {/* Google Analytics Connection */}
      <section
        className="rounded-xl border p-6 mb-4"
        style={{ borderColor: isGoogleConnected ? "#00ff8730" : "#2a2a2a", background: "#1a1a1a" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555" }}>
          YouTube Analytics
        </h2>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {isGoogleConnected ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#00ff87" }} />
                  <span className="text-white text-sm font-semibold">Connected</span>
                </div>
                <div className="text-xs" style={{ color: "#555" }}>
                  {googleToken.email ?? "Google account linked"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#444" }}>
                  Unlocks time-series charts: daily views, subscriber growth, watch time
                </div>
              </>
            ) : (
              <>
                <div className="text-white text-sm font-semibold mb-1">
                  Connect Google for Analytics
                </div>
                <div className="text-xs leading-relaxed" style={{ color: "#555" }}>
                  Unlocks daily view trends, subscriber growth charts, and watch time data â€”
                  the same kind of time-series graphs Viewstats shows. We only request
                  read-only access.
                </div>
              </>
            )}
          </div>

          <GoogleConnectButton isConnected={isGoogleConnected} />
        </div>

        {isGoogleConnected && (
          <div
            className="mt-4 pt-4 border-t grid grid-cols-3 gap-3"
            style={{ borderColor: "#2a2a2a" }}
          >
            {[
              { icon: "ðŸ“ˆ", label: "Daily views chart" },
              { icon: "ðŸ‘¥", label: "Subscriber trends" },
              { icon: "â±ï¸", label: "Watch time hours" },
            ].map((f) => (
              <div
                key={f.label}
                className="text-center px-2 py-3 rounded-lg"
                style={{ background: "#00ff8708", border: "1px solid #00ff8720" }}
              >
                <div className="text-lg mb-1">{f.icon}</div>
                <div className="text-xs" style={{ color: "#00ff87" }}>{f.label}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Plan */}
      <section
        className="rounded-xl border p-6"
        style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#555" }}>
          Plan
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-semibold capitalize">{profile?.plan ?? "free"}</div>
            <div className="text-sm mt-0.5" style={{ color: "#555" }}>
              {isPro ? "Full access to all features" : PLANS.free.tagline}
            </div>
          </div>
          {isPro ? (
            <a
              href="/api/stripe/portal"
              className="text-sm px-4 py-2 rounded-lg border transition-colors hover:border-white"
              style={{ borderColor: "#2a2a2a", color: "#888" }}
            >
              Manage subscription
            </a>
          ) : (
            <form action="/api/stripe/checkout" method="POST">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg font-semibold text-black text-sm transition-opacity hover:opacity-90"
                style={{ background: "#00ff87" }}
              >
                Upgrade to Pro Â· ${PLANS.pro.priceMonthly}/mo
              </button>
            </form>
          )}
        </div>

        {!isPro && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "#2a2a2a" }}>
            <p className="text-xs mb-3" style={{ color: "#555" }}>Pro includes:</p>
            <div className="text-sm space-y-1.5" style={{ color: "#888" }}>
              {PLANS.pro.features.map((f) => (
                <div key={f}>âœ“ {f}</div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

