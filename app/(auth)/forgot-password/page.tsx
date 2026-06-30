"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0f0f0f" }}>
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p style={{ color: "#888" }}>
            If an account exists for <strong className="text-white">{email}</strong>, we&apos;ve sent a link to reset your password.
          </p>
          <Link href="/login" className="inline-block mt-6 text-sm hover:underline" style={{ color: "#00ff87" }}>
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0f0f0f" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">Reset your password</h1>
          <p className="text-sm" style={{ color: "#888" }}>Enter your email and we&apos;ll send you a reset link.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: "#888" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg text-white text-sm outline-none transition-all"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-black text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#00ff87" }}
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "#555" }}>
          Remembered it?{" "}
          <Link href="/login" className="hover:underline" style={{ color: "#00ff87" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
