"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  icon,
  badge,
  ai,
  children,
}: {
  href: string;
  icon: string;
  badge?: string;
  ai?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  if (ai) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
        style={{
          color: isActive ? "#fff" : "#c084fc",
          background: isActive
            ? "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(139,92,246,0.15))"
            : "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.06))",
          border: `1px solid ${isActive ? "rgba(168,85,247,0.5)" : "rgba(168,85,247,0.2)"}`,
          fontWeight: 700,
          boxShadow: isActive ? "0 0 12px rgba(168,85,247,0.2)" : "none",
        }}
      >
        <span>{icon}</span>
        <span>{children}</span>
        {badge && (
          <span
            className="ml-auto text-xs px-1.5 py-0.5 rounded font-bold"
            style={{ background: "rgba(168,85,247,0.3)", color: "#e9d5ff" }}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
      style={{
        color: isActive ? "#00ff87" : "#888",
        background: isActive ? "rgba(0,255,135,0.08)" : "transparent",
        fontWeight: isActive ? 600 : 400,
      }}
    >
      <span>{icon}</span>
      <span>{children}</span>
      {badge && (
        <span
          className="ml-auto text-xs px-1.5 py-0.5 rounded font-medium"
          style={{ background: "#00ff8720", color: "#00ff87" }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
