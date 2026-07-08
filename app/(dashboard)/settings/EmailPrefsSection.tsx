"use client";

import { useState } from "react";

/**
 * Weekly-email opt in/out for logged-in users. The email itself also carries a
 * one-click unsubscribe link (no login), but this lets users re-enable and see
 * the state while they're in the app.
 */
export default function EmailPrefsSection({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !enabled;
    setEnabled(next); // optimistic
    setSaving(true);
    try {
      const res = await fetch("/api/settings/email-prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyEmailEnabled: next }),
      });
      if (!res.ok) setEnabled(!next); // revert on failure
    } catch {
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-xl border p-6 mb-4"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
        Email
      </h2>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-foreground text-sm font-medium">Weekly breakout email</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Every Monday: the top breakouts in your niche + what to make next.
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle weekly breakout email"
          className="flex-shrink-0 rounded-full transition-colors"
          style={{
            width: 44,
            height: 24,
            background: enabled ? "#00ff87" : "var(--border)",
            position: "relative",
            opacity: saving ? 0.6 : 1,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: enabled ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: enabled ? "#0f0f0f" : "#fff",
              transition: "left 0.15s ease",
            }}
          />
        </button>
      </div>
    </section>
  );
}
