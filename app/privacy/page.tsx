import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · TubeWatch",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-16" style={{ background: "#0f0f0f", color: "#ccc" }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm hover:underline" style={{ color: "#00ff87" }}>← TubeWatch</Link>
        <h1 className="text-3xl font-black text-white mt-6 mb-2">Privacy Policy</h1>
        <p className="text-sm mb-8" style={{ color: "#666" }}>Last updated: July 2026 · Beta</p>

        <div
          className="rounded-lg p-4 mb-8 text-sm"
          style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)", color: "#ffcf80" }}
        >
          This policy was drafted with AI assistance for the TubeWatch beta. It is not legal advice and should
          be reviewed and replaced with a counsel-approved policy before general availability.
        </div>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-white font-bold mb-2">What we collect</h2>
            <p>Account details you provide (email, password handled by our authentication provider); YouTube channel data you connect via Google OAuth (channel stats, video metadata and performance, and — if you connect Google Analytics for YouTube — time-series view/subscriber/watch-time data); billing information, which is collected and stored directly by our payment processor and not by us; and basic usage/log data (pages visited, feature usage, error logs) needed to operate and secure the Service. We request only the YouTube/Google scopes required to show your analytics.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">How we use it</h2>
            <p>To provide and improve analytics and AI insights, process subscriptions, send transactional email (e.g. sync summaries, billing receipts), respond to support requests, and keep the Service secure and reliable. We do not sell your personal data, and we do not use your data for third-party advertising.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Cookies &amp; similar technology</h2>
            <p>We use essential cookies to keep you signed in and to remember basic preferences (like light/dark theme). We do not use third-party advertising or cross-site tracking cookies.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Google &amp; YouTube data</h2>
            <p>TubeWatch&apos;s use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements — this data is used only to provide the analytics features you see in the app, not for advertising or unrelated purposes. You can disconnect a channel or revoke Google access at any time in Settings.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Third parties we work with</h2>
            <p>We rely on a small set of trusted service providers to operate TubeWatch: our database and authentication provider, our payment processor for billing, our email provider for transactional email, our AI provider for generating insights, and the YouTube Data API for channel/video data. Each processes data solely on our behalf to deliver the Service. Content sent to the AI provider is used to generate your response and is not used to train third-party foundation models.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Data retention</h2>
            <p>We retain account and channel data for as long as your account is active. If you delete your account, we delete or anonymize your personal data and disconnected-channel data within a reasonable period, except where we&apos;re required to retain records (e.g. billing history) for legal or accounting purposes.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Security</h2>
            <p>We use industry-standard safeguards — encryption in transit, access controls, and row-level security on your data — to protect your information. No method of transmission or storage is 100% secure, and we can&apos;t guarantee absolute security.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Children&apos;s privacy</h2>
            <p>TubeWatch is not directed at children under 13 (or the minimum age required in your region), and we do not knowingly collect personal data from children. If you believe a child has provided us data, contact support and we&apos;ll remove it.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">International users</h2>
            <p>Your data may be processed in countries other than your own by us or our service providers. By using the Service, you consent to this transfer, in accordance with this policy.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Your choices &amp; rights</h2>
            <p>You may access, export, correct, or delete your account data, and revoke Google access, at any time. Depending on your location, you may have additional rights under laws like the GDPR or CCPA (e.g. to object to processing or request a copy of your data). Contact support for any data requests.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Changes to this policy</h2>
            <p>We may update this policy from time to time. We&apos;ll update the &quot;Last updated&quot; date above, and for material changes we&apos;ll make reasonable efforts to notify active users.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Contact</h2>
            <p>Privacy questions or data requests? Email support and we&apos;ll respond.</p>
          </div>
        </section>

        <p className="mt-10 text-sm flex gap-4">
          <Link href="/terms" className="hover:underline" style={{ color: "#00ff87" }}>Terms of Service →</Link>
          <Link href="/about" className="hover:underline" style={{ color: "#00ff87" }}>About →</Link>
        </p>
      </div>
    </main>
  );
}
