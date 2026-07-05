import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Auth-gated app surface and API are noise for crawlers; the public
        // face is the landing page, leaderboards, and channel pages.
        disallow: ["/api/", "/dashboard", "/settings", "/billing", "/connect"],
      },
    ],
    sitemap: "https://www.tubewatchhq.com/sitemap.xml",
  };
}
