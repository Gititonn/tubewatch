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
        <p className="text-sm mb-8" style={{ color: "#666" }}>Last updated: July 2026 · Beta</p>

        <div
          className="rounded-lg p-4 mb-8 text-sm"
          style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)", color: "#ffcf80" }}
        >
          This agreement was drafted with AI assistance for the TubeWatch beta. It is not legal advice and
          should be reviewed and replaced with counsel-approved terms before general availability.
        </div>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-white font-bold mb-2">1. Acceptance of terms</h2>
            <p>By creating an account or using TubeWatch (the &quot;Service&quot;), you agree to these Terms of Service and our <Link href="/privacy" className="underline" style={{ color: "#00ff87" }}>Privacy Policy</Link>. If you do not agree, do not use the Service.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">2. The service</h2>
            <p>TubeWatch provides YouTube analytics and AI-assisted insights for creators. The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis during beta, and features, pricing, and availability may change or be discontinued at any time.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">3. Eligibility &amp; your account</h2>
            <p>You must be at least the age of majority in your jurisdiction to use the Service, and you must provide accurate account information. You are responsible for safeguarding your login credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">4. Acceptable use</h2>
            <p>You agree not to: misuse the Service or attempt to access it by unauthorized means (including scraping, reverse engineering, or circumventing rate limits); interfere with the Service&apos;s operation or security; use the Service to violate any law; or use it in a way that violates the terms of any connected third-party platform, including the YouTube Terms of Service and the Google API Services User Data Policy. We may suspend or terminate accounts that violate this section.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">5. Connected accounts &amp; third-party data</h2>
            <p>The Service reads publicly available and OAuth-authorized YouTube/Google data to generate analytics. You represent that you have the right to connect any channel you add (your own, or one you are authorized to analyze for competitive research), and that your use of that data through TubeWatch complies with YouTube&apos;s and Google&apos;s own terms. You can disconnect any channel at any time from Settings.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">6. AI-generated content</h2>
            <p>Outlier explanations, strategy suggestions, and other AI-generated insights are provided for informational purposes only. They are generated automatically, may be inaccurate or incomplete, and are not a guarantee of any outcome, including subscriber growth, view counts, or monetization eligibility. You are responsible for your own content and strategy decisions.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">7. Subscriptions &amp; billing</h2>
            <p>Paid plans are billed in advance on a recurring basis through our payment processor (Stripe). No credit card is required for the free plan. You can cancel a paid plan at any time from Billing; access continues through the end of the current billing period and we do not provide partial-period refunds except where required by law. We may change pricing on a going-forward basis with notice.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">8. Termination</h2>
            <p>You may stop using the Service and delete your account at any time. We may suspend or terminate your access if you violate these Terms, misuse the Service, or if required by law. Upon termination, your right to use the Service ends immediately; certain provisions (including intellectual property, disclaimers, and limitation of liability) survive termination.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">9. Intellectual property</h2>
            <p>TubeWatch and its original content (excluding data pulled from YouTube/Google and content you provide) are owned by us and protected by intellectual property laws. You retain all rights to your own YouTube content and channel data. If you send us feedback or suggestions, you grant us the right to use them without restriction or compensation.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">10. Disclaimers</h2>
            <p>To the maximum extent permitted by law, the Service is provided without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that analytics or AI outputs will be accurate.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">11. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, TubeWatch and its team are not liable for indirect, incidental, special, consequential, or punitive damages, or any loss of revenue, data, or goodwill, arising from your use of the Service, even if advised of the possibility of such damages. Our total liability for any claim relating to the Service is limited to the amount you paid us in the twelve months before the claim arose.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">12. Changes to these terms</h2>
            <p>We may update these Terms from time to time. We&apos;ll update the &quot;Last updated&quot; date above, and for material changes we&apos;ll make reasonable efforts to notify active users. Continued use of the Service after changes take effect constitutes acceptance.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">13. Governing law</h2>
            <p>These Terms are governed by the laws applicable in the jurisdiction where TubeWatch operates, without regard to conflict-of-law principles, except where local consumer protection law requires otherwise.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">14. Contact</h2>
            <p>Questions about these terms? Email support and we&apos;ll help.</p>
          </div>
        </section>

        <p className="mt-10 text-sm flex gap-4">
          <Link href="/privacy" className="hover:underline" style={{ color: "#00ff87" }}>Privacy Policy →</Link>
          <Link href="/about" className="hover:underline" style={{ color: "#00ff87" }}>About →</Link>
        </p>
      </div>
    </main>
  );
}
