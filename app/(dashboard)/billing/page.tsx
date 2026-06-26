"use client";

import { useEffect, useState } from "react";

type BillingStatus = {
  plan: "free" | "pro" | "growth";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const FREE_FEATURES = [
  "1 competitor channel",
  "30-day history",
  "Basic outlier feed",
  "Dashboard & videos",
];

const PRO_FEATURES = [
  "10 competitor channels",
  "Full history",
  "🧠 AI \"Why It Worked\"",
  "Trending & Rising",
  "Patterns analysis",
  "Compare tool",
];

const GROWTH_FEATURES = [
  "Unlimited competitor channels",
  "Everything in Pro",
  "Priority sync (6h vs 24h)",
  "API access (coming soon)",
];

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#ccc" }}>
          <span style={{ color: "#00ff87", flexShrink: 0 }}>✓</span>
          {f}
        </li>
      ))}
    </ul>
  );
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgraded, setUpgraded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      setUpgraded(true);
    }

    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((data: BillingStatus) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const currentPlan = status?.plan ?? "free";
  const isPaid = currentPlan === "pro" || currentPlan === "growth";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#fff" }}>Billing</h1>
      <p className="text-sm mb-8" style={{ color: "#888" }}>
        Manage your TubeWatch subscription.
      </p>

      {upgraded && (
        <div
          className="mb-6 px-4 py-3 rounded-lg text-sm font-medium"
          style={{ background: "#00ff8720", border: "1px solid #00ff87", color: "#00ff87" }}
        >
          Your plan has been upgraded successfully!
        </div>
      )}

      {loading ? (
        <div className="text-sm" style={{ color: "#888" }}>Loading billing status…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Free Plan */}
            <div
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: "#141414",
                border: `1px solid ${currentPlan === "free" ? "#00ff87" : "#2a2a2a"}`,
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold" style={{ color: "#fff" }}>Free</h2>
                {currentPlan === "free" && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "#00ff8720", color: "#00ff87" }}
                  >
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-bold" style={{ color: "#fff" }}>$0<span className="text-sm font-normal" style={{ color: "#888" }}>/mo</span></p>
              <FeatureList features={FREE_FEATURES} />
              <div className="mt-auto pt-6">
                <div
                  className="w-full py-2 rounded-lg text-sm text-center"
                  style={{ background: "#1a1a1a", color: "#555", cursor: "default" }}
                >
                  Free forever
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <div
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: "#141414",
                border: `1px solid ${currentPlan === "pro" ? "#00ff87" : "#2a2a2a"}`,
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold" style={{ color: "#fff" }}>Pro</h2>
                {currentPlan === "pro" && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "#00ff8720", color: "#00ff87" }}
                  >
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-bold" style={{ color: "#fff" }}>$19<span className="text-sm font-normal" style={{ color: "#888" }}>/mo</span></p>
              <FeatureList features={PRO_FEATURES} />
              <div className="mt-auto pt-6">
                {currentPlan === "pro" ? (
                  <a
                    href="/api/stripe/portal"
                    className="block w-full py-2 rounded-lg text-sm text-center font-medium"
                    style={{ background: "#00ff8715", color: "#00ff87", border: "1px solid #00ff8740" }}
                  >
                    Manage billing
                  </a>
                ) : currentPlan === "growth" ? (
                  <div
                    className="w-full py-2 rounded-lg text-sm text-center"
                    style={{ background: "#1a1a1a", color: "#555", cursor: "default" }}
                  >
                    Downgrade via portal
                  </div>
                ) : (
                  <form action="/api/stripe/checkout" method="POST">
                    <input type="hidden" name="plan" value="pro" />
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                      style={{ background: "#00ff87", color: "#000" }}
                    >
                      Upgrade to Pro
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Growth Plan */}
            <div
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: "#141414",
                border: `1px solid ${currentPlan === "growth" ? "#00ff87" : "#2a2a2a"}`,
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold" style={{ color: "#fff" }}>Growth</h2>
                {currentPlan === "growth" && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "#00ff8720", color: "#00ff87" }}
                  >
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-bold" style={{ color: "#fff" }}>$49<span className="text-sm font-normal" style={{ color: "#888" }}>/mo</span></p>
              <FeatureList features={GROWTH_FEATURES} />
              <div className="mt-auto pt-6">
                {currentPlan === "growth" ? (
                  <a
                    href="/api/stripe/portal"
                    className="block w-full py-2 rounded-lg text-sm text-center font-medium"
                    style={{ background: "#00ff8715", color: "#00ff87", border: "1px solid #00ff8740" }}
                  >
                    Manage billing
                  </a>
                ) : (
                  <form action="/api/stripe/checkout" method="POST">
                    <input type="hidden" name="plan" value="growth" />
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                      style={{ background: "#00ff87", color: "#000" }}
                    >
                      Upgrade to Growth
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {isPaid && (
            <div className="mt-6 text-sm" style={{ color: "#888" }}>
              Need to cancel or change payment method?{" "}
              <a href="/api/stripe/portal" style={{ color: "#00ff87" }}>
                Open billing portal →
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
