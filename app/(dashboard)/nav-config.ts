/**
 * SINGLE SOURCE OF TRUTH for dashboard navigation.
 * Both the desktop sidebar (layout.tsx) and the mobile drawer (MobileNav.tsx)
 * render from this config via <NavSections>, so the two can never drift apart.
 */

export type NavItem = {
  href: string;
  icon: string;
  label: string;
  ai?: boolean; // renders the purple AI-glow variant
};

export type NavSection = {
  label?: string; // section header (DISCOVER / ANALYZE / AI); omit for the top group
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/dashboard", icon: "⊞", label: "Dashboard" },
      { href: "/videos", icon: "▶", label: "Videos" },
    ],
  },
  {
    label: "Discover",
    items: [
      { href: "/trending", icon: "📈", label: "Trending" },
      { href: "/rising", icon: "🚀", label: "Rising" },
      { href: "/competitors", icon: "⚡", label: "Competitors" },
      { href: "/competitors/outliers", icon: "🔥", label: "Outlier Feed" },
    ],
  },
  {
    label: "Analyze",
    items: [
      { href: "/outlier", icon: "⭐", label: "Outlier Score" },
      { href: "/patterns", icon: "🎯", label: "Patterns" },
      { href: "/compare", icon: "⚖", label: "Compare" },
    ],
  },
  {
    label: "AI",
    items: [{ href: "/ai", icon: "🧠", label: "AI Coach", ai: true }],
  },
];

/** Pinned to the bottom of the nav (pushed down with mt-auto). */
export const NAV_BOTTOM: NavItem[] = [
  { href: "/billing", icon: "💳", label: "Billing" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

/** Every nav href, used to resolve the single active item. */
export const ALL_NAV_HREFS: string[] = [
  ...NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href)),
  ...NAV_BOTTOM.map((i) => i.href),
];

/**
 * Returns the single href that should be highlighted for `pathname`, using
 * longest-prefix matching so a nested route (e.g. /competitors/outliers) wins
 * over its parent (/competitors) instead of highlighting both.
 */
export function resolveActiveHref(pathname: string, hrefs: string[] = ALL_NAV_HREFS): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const isMatch =
      href === "/dashboard"
        ? pathname === href
        : pathname === href || pathname.startsWith(href + "/");
    if (isMatch && (best === null || href.length > best.length)) best = href;
  }
  return best;
}
