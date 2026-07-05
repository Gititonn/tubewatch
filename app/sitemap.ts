import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";

const BASE = "https://www.tubewatchhq.com";

/**
 * Static pages + the per-niche leaderboards. Leaderboard pages are the SEO
 * play (indexable, keyword-bearing, one per niche), so they carry the higher
 * priority. /channel/[handle] pages are unbounded and thin until visited, so
 * they're left for organic discovery rather than the sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/channel`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.1 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.1 },
  ];

  const leaderboards: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${BASE}/leaderboard/${c.id}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticPages, ...leaderboards];
}
