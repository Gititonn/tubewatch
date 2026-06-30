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
        <p className="text-sm mb-8" style={{ color: "#666" }}>Last updated: June 2026 · Beta</p>

        <div
          className="rounded-lg p-4 mb-8 text-sm"
          style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)", color: "#ffcf80" }}
        >
          This is a placeholder policy for the TubeWatch beta. It should be reviewed and replaced with a
          counsel-approved policy before general availability.
        </div>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="text-white font-bold mb-2">What we collect</h2>
            <p>Account details you provide (email), YouTube channel data you connect via Google OAuth, and basic usage data needed to operate the Service. We request only the YouTube/Google scopes required to show your analytics.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">How we use it</h2>
            <p>To provide and improve analytics and AI insights, process subscriptions, send transactional email, and keep the Service secure. We do not sell your personal data.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Google &amp; YouTube data</h2>
            <p>TubeWatch&apos;s use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. You can disconnect your channel at any time in Settings.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Third parties</h2>
            <p>We use trusted processors (such as our database/auth, payment, and email providers, and our AI provider) solely to operate the Service. Content sent to the AI Engine is used to generate your response and is not used to train third-party models.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Your choices</h2>
            <p>You may access, export, or delete your account data, and revoke Google access, at any time. Contact support for data requests.</p>
          </div>
          <div>
            <h2 className="text-white font-bold mb-2">Contact</h2>
            <p>Privacy questions? Email support and we&apos;ll respond.</p>
          </div>
        </section>

        <p className="mt-10 text-sm">
          <Link href="/terms" className="hover:underline" style={{ color: "#00ff87" }}>Terms of Service →</Link>
        </p>
      </div>
    </main>
  );
}
