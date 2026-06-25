import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0f0f0f" }}>
      <div className="text-center max-w-2xl">
        <div className="mb-6 inline-block px-3 py-1 rounded-full text-xs font-medium border" style={{ borderColor: "#00ff87", color: "#00ff87" }}>
          Beta — Free for early creators
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
          YouTube analytics built for creators who{" "}
          <span style={{ color: "#00ff87" }}>aren&apos;t famous yet.</span>
        </h1>
        <p className="text-lg mb-8" style={{ color: "#888888" }}>
          Find your outlier videos, understand what&apos;s working, and grow faster.
          Built for channels with 0&#8211;100K subscribers.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 rounded-lg font-semibold text-black transition-opacity hover:opacity-90"
            style={{ background: "#00ff87" }}
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg font-semibold border transition-colors hover:border-white"
            style={{ borderColor: "#2a2a2a", color: "#888888" }}
          >
            Sign in
          </Link>
        </div>
        <p className="mt-6 text-sm" style={{ color: "#444" }}>
          No credit card required · Free plan available
        </p>
      </div>
    </main>
  );
}
