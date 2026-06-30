"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    // The recovery link in the email establishes a session on page load,
    // so updateUser applies to the user who requested the reset.
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0f0f0f" }}>
        <div className="text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">Password updated</h2>
          <p style={{ color: "#888" }}>Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0f0f0f" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">Set a new password</h1>
          <p className="text-sm" style={{ color: "#888" }}>Choose a strong password you don&apos;t use elsewhere.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: "#888" }}>New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 rounded-lg text-white text-sm outline-none transition-all"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: "#888" }}>Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 rounded-lg text-white text-sm outline-none transition-all"
              style={{
                background: "#1a1a1a",
                border: `1px solid ${confirm && confirm !== password ? "#ef4444" : "#2a2a2a"}`,
              }}
              placeholder="Re-enter password"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-black text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#00ff87" }}
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "#555" }}>
          <Link href="/login" className="hover:underline" style={{ color: "#00ff87" }}>
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
