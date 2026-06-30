"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSignup(e: React.FormEvent) {
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
    if (!agreed) {
      setError("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0f0f0f" }}>
        <div className="text-center">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p style={{ color: "#888" }}>We sent a confirmation link to <strong className="text-white">{email}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0f0f0f" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-sm" style={{ color: "#888" }}>Free forever for small channels</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
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
          <div>
            <label className="block text-sm mb-1" style={{ color: "#888" }}>Password</label>
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
            <label className="block text-sm mb-1" style={{ color: "#888" }}>Confirm password</label>
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
            {confirm && confirm !== password && (
              <p className="text-xs mt-1 text-red-400">Passwords don&apos;t match.</p>
            )}
          </div>
          <label className="flex items-start gap-2 text-xs" style={{ color: "#888" }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
              style={{ accentColor: "#00ff87" }}
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="hover:underline" style={{ color: "#00ff87" }}>Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" target="_blank" className="hover:underline" style={{ color: "#00ff87" }}>Privacy Policy</Link>.
            </span>
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !agreed}
            className="w-full py-2.5 rounded-lg font-semibold text-black text-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#00ff87" }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "#2a2a2a" }} />
          <span className="text-xs" style={{ color: "#555" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "#2a2a2a" }} />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full py-2.5 rounded-lg font-medium text-sm border transition-colors hover:border-white flex items-center justify-center gap-2"
          style={{ borderColor: "#2a2a2a", color: "#ccc", background: "#1a1a1a" }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm mt-6" style={{ color: "#555" }}>
          Already have an account?{" "}
          <Link href="/login" className="hover:underline" style={{ color: "#00ff87" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
