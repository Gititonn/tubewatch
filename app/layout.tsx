import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { FeedbackButton } from "./FeedbackButton";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TubeWatch — YouTube analytics for small creators",
  description: "YouTube analytics built for creators who aren't famous yet.",
};

// Inline script prevents flash of wrong theme on load
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('tw-theme');
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
        {/* Tally feedback widget — auto-fills logged-in user email via hidden field */}
        <FeedbackButton />
        <Script
          src="https://tally.so/widgets/embed.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
