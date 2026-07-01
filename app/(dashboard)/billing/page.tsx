"use client";

import { useEffect, useState } from "react";
import { PLANS, annualPrice } from "@/lib/plans";

type BillingStatus = {
  plan: "free" | "pro" | "growth";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

function CtaSkeleton() {
  // Keeps the card height stable while billing status loads, instead of
  // blanking the whole page behind a "Loading…" line on the checkout screen.
  return (
    <div
      className="w-full rounded-lg animate-pulse"
      style={{ background: "var(--border)", height: 36 }}
      aria-hidden
    />
  );
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {features.map((f) => {
        // Honest rendering: features tagged "(coming soon)" don't get a green
        // check — they show a muted dot + SOON tag so we never imply a shipped feature.
        const soon = / \(coming soon\)$/i.test(f);
        const label = f.replace(/ \(coming soon\)$/i, "");
        // Emphasize the AI Strategy Coach line — it's the headline upgrade reason.
        const isAI = f.includes("AI Strategy Coach");
        return (
          <li
            key={f}
            className="flex items-start gap-2 text-sm"
            style={{ color: soon ? "var(--text-muted)" : isAI ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: isAI ? 700 : 400 }}
          >
            <span style={{ color: soon ? "var(--text-muted)" : "#00ff87", flexShrink: 0 }}>{soon ? "○" : "✓"}</span>
            <span>
              {label}
              {soon && (
                <span
                  className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                >
                  SOON
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgraded, setUpgraded] = useState(false);
  const [annual, setAnnual] = useState(false);

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
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Billing</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
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

      <div className="flex items-center justify-center gap-3 mb-8">
        <span style={{ color: !annual ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: 600, fontSize: 14 }}>Monthly</span>
        <button
          onClick={() => setAnnual((a) => !a)}
          role="switch"
          aria-checked={annual}
          aria-label="Toggle annual billing"
          className="relative rounded-full transition-colors"
          style={{ width: 48, height: 26, background: annual ? "#00ff87" : "var(--border)" }}
        >
          <span
            className="absolute rounded-full transition-transform"
            style={{ top: 3, left: 3, width: 20, height: 20, background: "#fff", transform: annual ? "translateX(22px)" : "translateX(0)" }}
          />
        </button>
        <span style={{ color: annual ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: 600, fontSize: 14 }}>
          Annual <span style={{ color: "#00ff87" }}>· 2 months free</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:gap-4 md:grid-cols-3 mt-3">
            {/* Free Plan */}
            <div
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${currentPlan === "free" ? "#00ff87" : "#2a2a2a"}`,
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Free</h2>
                {currentPlan === "free" && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "#00ff8720", color: "#00ff87" }}
                  >
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>${PLANS.free.priceMonthly}<span className="text-sm font-normal" style={{ color: "var(--text-secondary)" }}>/mo</span></p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{PLANS.free.tagline}</p>
              <FeatureList features={PLANS.free.features} />
              <div className="mt-auto pt-6">
                <div
                  className="w-full py-2 rounded-lg text-sm text-center"
                  style={{ background: "#1a1a1a", color: "var(--text-muted)", cursor: "default" }}
                >
                  Free forever
                </div>
              </div>
            </div>

            {/* Pro Plan — visual anchor: glowing brand border, lifted scale, top badge */}
            <div
              className="rounded-xl p-6 flex flex-col relative z-10"
              style={{
                background: "var(--bg-card)",
                border: "1px solid #00ff87",
                transform: "scale(1.03)",
                boxShadow: "0 0 28px rgba(0,255,135,0.28), 0 0 0 1px rgba(0,255,135,0.4)",
              }}
            >
              <span
                className="absolute left-1/2 -translate-x-1/2 -top-3 whitespace-nowrap text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: "#00ff87", color: "#000", boxShadow: "0 2px 10px rgba(0,255,135,0.4)" }}
              >
                Most Popular for Growing Creators
              </span>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Pro</h2>
                {currentPlan === "pro" && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "#00ff8720", color: "#00ff87" }}
                  >
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>${annual ? annualPrice(PLANS.pro) : PLANS.pro.priceMonthly}<span className="text-sm font-normal" style={{ color: "var(--text-secondary)" }}>{annual ? "/yr" : "/mo"}</span></p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "#00ff87" }}>{PLANS.pro.tagline}</p>
              <FeatureList features={PLANS.pro.features} />
              <div className="mt-auto pt-6">
                {loading ? <CtaSkeleton /> : currentPlan === "pro" ? (
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
                    style={{ background: "#1a1a1a", color: "var(--text-muted)", cursor: "default" }}
                  >
                    Downgrade via portal
                  </div>
                ) : (
                  <form action="/api/stripe/checkout" method="POST">
                    <input type="hidden" name="plan" value="pro" />
                    <input type="hidden" name="cycle" value={annual ? "annual" : "monthly"} />
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                      style={{ background: "#00ff87", color: "#000" }}
                    >
                      {PLANS.pro.ctaUpgrade}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Growth Plan */}
            <div
              className="rounded-xl p-6 flex flex-col"
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${currentPlan === "growth" ? "#00ff87" : "#2a2a2a"}`,
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Growth</h2>
                {currentPlan === "growth" && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "#00ff8720", color: "#00ff87" }}
                  >
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>${annual ? annualPrice(PLANS.growth) : PLANS.growth.priceMonthly}<span className="text-sm font-normal" style={{ color: "var(--text-secondary)" }}>{annual ? "/yr" : "/mo"}</span></p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{PLANS.growth.tagline}</p>
              <FeatureList features={PLANS.growth.features} />
              <div className="mt-auto pt-6">
                {loading ? <CtaSkeleton /> : currentPlan === "growth" ? (
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
                    <input type="hidden" name="cycle" value={annual ? "annual" : "monthly"} />
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                      style={{ background: "#00ff87", color: "#000" }}
                    >
                      {PLANS.growth.ctaUpgrade}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {isPaid && (
            <div className="mt-6 text-sm" style={{ color: "var(--text-secondary)" }}>
              Need to cancel or change payment method?{" "}
              <a href="/api/stripe/portal" style={{ color: "#00ff87" }}>
                Open billing portal →
              </a>
            </div>
          )}
    </div>
  );
}
