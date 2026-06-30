import { PLANS } from "@/lib/plans";

/**
 * Shared Pro paywall screen. Used by any feature page that is Pro-gated
 * (Compare, Patterns, …) so the lock state looks identical everywhere.
 */
export function ProLockScreen({ feature }: { feature: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
      <h2 style={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: "0.5rem" }}>
        {feature} is a Pro Feature
      </h2>
      <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
        Available on Pro — ${PLANS.pro.priceMonthly}/mo. Unlock unlimited competitors, AI insights,
        and advanced analytics.
      </p>
      <a
        href="/billing"
        style={{
          background: "#00ff87",
          color: "#000",
          fontWeight: 700,
          padding: "0.75rem 1.5rem",
          borderRadius: "0.75rem",
          textDecoration: "none",
        }}
      >
        Upgrade to Pro →
      </a>
    </div>
  );
}
