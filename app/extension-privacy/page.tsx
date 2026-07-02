import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browser Extension Privacy Policy | TubeWatch",
  description: "What the TubeWatch browser extension collects, how it's used, and what it never touches.",
};

const UPDATED = "July 2, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>{title}</h2>
      <div className="space-y-2" style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.7 }}>
        {children}
      </div>
    </section>
  );
}

export default function ExtensionPrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-12" style={{ color: "var(--text-primary)" }}>
      <h1 className="text-3xl font-black mb-1">TubeWatch Extension — Privacy Policy</h1>
      <p className="mb-8" style={{ color: "var(--text-muted)", fontSize: 14 }}>Last updated {UPDATED}</p>

      <Section title="What the extension does">
        <p>
          The TubeWatch browser extension overlays outlier scores and stats on YouTube.
          To do that, it reads the video IDs of the thumbnails and watch pages you view
          on <strong>youtube.com</strong> and sends them to TubeWatch to look up each
          video&apos;s public performance metrics.
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>YouTube video IDs</strong> you encounter while browsing YouTube — sent to
            our API so we can return an outlier score and stats for them.
          </li>
          <li>
            <strong>Your TubeWatch API key</strong> — stored locally in the browser
            (<code>chrome.storage.local</code>) and sent with each request so we can
            authenticate you and apply your plan&apos;s rate limits.
          </li>
        </ul>
      </Section>

      <Section title="What we never collect">
        <ul className="list-disc pl-5 space-y-1">
          <li>Your browsing history on any site other than the YouTube video IDs described above.</li>
          <li>Personal information — no name, email, keystrokes, form data, or contacts.</li>
          <li>Anything from non-YouTube websites. The extension only runs on youtube.com.</li>
          <li>We do <strong>not</strong> build a per-user profile of what you watch. Video IDs
            are used to return scores and to store <em>public video metrics</em> that are not
            linked to your identity.</li>
        </ul>
      </Section>

      <Section title="How the data is used">
        <p>
          Video IDs are used solely to compute and cache outlier scores. The public metrics we
          fetch (view counts, publish dates, channel medians) are stored in aggregate to power
          TubeWatch&apos;s scoring for everyone — as data <em>about videos and channels</em>,
          never about you. We do not sell data, and we do not use it for advertising.
        </p>
      </Section>

      <Section title="Third parties">
        <p>
          To fetch public video and channel statistics we use the <strong>YouTube Data API</strong>,
          subject to Google&apos;s Privacy Policy (policies.google.com/privacy) and the YouTube
          Terms of Service. We share no data with any other third party.
        </p>
      </Section>

      <Section title="Your control">
        <p>
          You can disconnect the extension at any time by clearing the API key in the popup or
          removing the extension. You can rotate or revoke your API key from TubeWatch →
          Settings → Browser Extension, which immediately invalidates the old key.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy? Email{" "}
          <a href="mailto:support@tubewatchhq.com" style={{ color: "#00ff87" }}>support@tubewatchhq.com</a>.
        </p>
      </Section>
    </div>
  );
}
