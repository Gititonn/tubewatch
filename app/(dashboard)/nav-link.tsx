"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  icon,
  badge,
  children,
}: {
  href: string;
  icon: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

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
