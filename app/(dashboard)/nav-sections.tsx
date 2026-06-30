"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { NavLink } from "./nav-link";
import { NAV_SECTIONS, NAV_BOTTOM, resolveActiveHref } from "./nav-config";

/**
 * Renders the full nav (section headers + items + pinned bottom group) from the
 * shared nav-config. Used by BOTH the desktop sidebar and the mobile drawer so
 * the markup, active-route highlighting, and AI glow stay identical.
 *
 * Items are emitted as direct children (via Fragments) of the parent <nav>,
 * which must be `flex flex-col gap-0.5 flex-1` for spacing + mt-auto to work.
 */
export function NavSections({ aiBadge }: { aiBadge: string }) {
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname);

  return (
    <>
      {NAV_SECTIONS.map((section) => (
        <Fragment key={section.label ?? "top"}>
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

      <div className="mt-auto pt-4 flex flex-col gap-0.5">
        {NAV_BOTTOM.map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} active={item.href === activeHref}>
            {item.label}
          </NavLink>
        ))}
      </div>
    </>
  );
}

