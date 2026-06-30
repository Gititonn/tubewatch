"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Tally form ID — auto-fills logged-in user's email via the user_email hidden field
const TALLY_FORM_ID = "PdgGMd";

export function FeedbackButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Grab the logged-in user's email from Supabase (if any)
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
  }, []);

  // Don't render until we know whether the user is logged in
  if (!ready) return null;

  return (
    <button
      data-tally-open={TALLY_FORM_ID}
      data-tally-overlay="1"
      data-tally-emoji-text="💬"
      data-tally-emoji-animation="wave"
      {...(email ? { "data-user_email": email } : {})}
      aria-label="Share feedback"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.5rem 1rem",
        borderRadius: "9999px",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        color: "var(--text-secondary)",
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        transition: "all 0.15s ease",
        letterSpacing: "0.02em",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      <span style={{ fontSize: "0.9rem" }}>💬</span>
      Feedback
    </button>
  );
}
