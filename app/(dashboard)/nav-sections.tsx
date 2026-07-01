"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./ThemeToggle";
import { NAV_SECTIONS, resolveActiveHref } from "./nav-config";

/**
 * Renders the full nav (section headers + items, then Theme + Sign out as the
 * final rows) from the shared nav-config. Used by BOTH the desktop sidebar and
 * the mobile drawer so the markup, active-route highlighting, and AI glow stay
 * identical.
 *
 * Items are emitted as direct children (via Fragments) of the parent <nav>,
 * which must be `flex flex-col gap-0.5` for spacing to work.
 */
export function NavSections({ aiBadge }: { aiBadge: string }) {
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname);

  return (
    <>
      {NAV_SECTIONS.map((section, i) => (
        <Fragment key={section.label ?? `section-${i}`}>
          {section.label && (
            <div className="mt-3 mb-1 px-2">
              <span
                className="text-xs uppercase tracking-widest font-semibold"
                style={{ color: "var(--nav-label)" }}
              >
                {section.label}
              </span>
            </div>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              ai={item.ai}
              badge={item.ai ? aiBadge : undefined}
              active={item.href === activeHref}
            >
              {item.label}
            </NavLink>
          ))}
        </Fragment>
      ))}

      <ThemeToggle />

      <form action="/api/auth/signout" method="POST">
        <button
          type="submit"
          className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
        >
          <span>🚪</span>
          <span>Sign out</span>
        </button>
      </form>
    </>
  );
}

