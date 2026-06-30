import Link from "next/link";

export const metadata = {
  title: "Terms of Service · TubeWatch",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-16" style={{ background: "#0f0f0f", color: "#ccc" }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm hover:underline" style={{ color: "#00ff87" }}>← TubeWatch</Link>
        <h1 className="text-3xl font-black text-white mt-6 mb-2">Terms of Service</h1>
        <p className="text-sm mb-8" style={{ color: "#666" }}>Last updated: June 2026 · Beta</p>

        <div
          className="rounded-lg p-4 mb-8 text-sm"
          style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)", color: "#ffcf80" }}
        >
          This is a placeholder agreement for the TubeWatch beta. It should be reviewed and replaced with
          counsel-approved terms before general availability.
        </div>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-white font-bold mb-2">1. Acceptance of terms</h2>
            <p>By creating an account or using TubeWatch (the &quot;Service&quot;), you agree to these Terms of Service. If you do not agree, do not use the Service.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">2. The service</h2>
            <p>TubeWatch provides YouTube analytics and AI-assisted insights for creators. The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis during beta, and features may change or be discontinued.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">3. Your account</h2>
            <p>You are responsible for safeguarding your login credentials and for all activity under your account. You must provide accurate information and be at least the age of majority in your jurisdiction.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">4. Acceptable use</h2>
            <p>You agree not to misuse the Service, attempt to access it by unauthorized means, or use it to violate any law or the terms of third-party platforms (including the YouTube Terms of Service and Google API policies).</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">5. Subscriptions &amp; billing</h2>
            <p>Paid plans are billed in advance on a recurring basis through our payment processor. You can cancel at any time; access continues through the end of the current billing period. No credit card is required for the free plan.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">6. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, TubeWatch is not liable for indirect, incidental, or consequential damages arising from your use of the Service.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">7. Contact</h2>
            <p>Questions about these terms? Email support and we&apos;ll help.</p>
          </div>
        </section>

        <p className="mt-10 text-sm">
          <Link href="/privacy" className="hover:underline" style={{ color: "#00ff87" }}>Privacy Policy →</Link>
        </p>
      </div>
    </main>
  );
}
