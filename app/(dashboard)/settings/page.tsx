import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const isPro = profile?.plan === "pro";

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <section
        className="rounded-xl border p-6 mb-6"
        style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
      >
        <h2 className="text-sm font-medium mb-4" style={{ color: "#888" }}>Account</h2>
        <div className="text-white text-sm">{user?.email}</div>
      </section>

      <section
        className="rounded-xl border p-6"
        style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
      >
        <h2 className="text-sm font-medium mb-4" style={{ color: "#888" }}>Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-semibold capitalize">{profile?.plan ?? "free"}</div>
            <div className="text-sm mt-0.5" style={{ color: "#555" }}>
              {isPro ? "Full access to all features" : "Limited to 50 videos per channel"}
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
                Upgrade to Pro · $19/mo
              </button>
            </form>
          )}
        </div>

        {!isPro && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "#2a2a2a" }}>
            <p className="text-xs mb-3" style={{ color: "#555" }}>Pro includes:</p>
            <ul className="text-sm space-y-1.5" style={{ color: "#888" }}>
              <li>✓ Unlimited video tracking</li>
              <li>✓ Unlimited AI insights</li>
              <li>✓ Daily auto-sync</li>
              <li>✓ Export CSV reports</li>
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
