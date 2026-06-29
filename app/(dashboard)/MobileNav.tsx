"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { href: "/dashboard", icon: "⊞", label: "Dashboard" },
  { href: "/videos", icon: "▶", label: "Videos" },
];

const discoverItems = [
  { href: "/trending", icon: "📈", label: "Trending" },
  { href: "/rising", icon: "🚀", label: "Rising" },
  { href: "/competitors", icon: "⚡", label: "Competitors" },
  { href: "/competitors/outliers", icon: "🔥", label: "Outlier Feed" },
];

const analyzeItems = [
  { href: "/outlier", icon: "⭐", label: "Outlier Score" },
  { href: "/patterns", icon: "🎯", label: "Patterns" },
  { href: "/compare", icon: "⚖", label: "Compare" },
];

const bottomItems = [
  { href: "/billing", icon: "💳", label: "Billing" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

function navIsActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export function MobileNav({ aiBadge = "NEW" }: { aiBadge?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const active = (href: string) => navIsActive(pathname, href);

  const linkStyle = (href: string): React.CSSProperties => ({
    color: active(href) ? "var(--accent)" : "var(--text-secondary)",
    background: active(href) ? "var(--accent-glow)" : "transparent",
    fontWeight: active(href) ? 600 : 400,
    textDecoration: "none",
  });

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b"
        style={{ background: "var(--bg-sidebar)", borderColor: "var(--border)" }}
      >
        <span className="text-lg font-black tracking-tight">
          <span style={{ color: "#ff3333" }}>Tube</span>
          <span style={{ color: "var(--accent)" }}>Watch</span>
        </span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-xl transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          ☰
        </button>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className="fixed top-0 left-0 z-50 h-full flex flex-col py-6 px-4"
        style={{
          width: "288px",
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "transform",
        }}
        aria-hidden={!open}
      >
        <div className="mb-8 px-2 flex items-center justify-between">
          <span className="text-lg font-black tracking-tight">
            <span style={{ color: "#ff3333" }}>Tube</span>
            <span style={{ color: "var(--accent)" }}>Watch</span>
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
              style={linkStyle(item.href)}
            >
              <span>{item.icon}</span><span>{item.label}</span>
            </a>
          ))}

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--nav-label)" }}>Discover</span>
          </div>
          {discoverItems.map((item) => (
            <a key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
              style={linkStyle(item.href)}
            >
              <span>{item.icon}</span><span>{item.label}</span>
            </a>
          ))}

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--nav-label)" }}>Analyze</span>
          </div>
          {analyzeItems.map((item) => (
            <a key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
              style={linkStyle(item.href)}
            >
              <span>{item.icon}</span><span>{item.label}</span>
            </a>
          ))}

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--nav-label)" }}>AI</span>
          </div>
          <a
            href="/ai"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
            style={{
              color: active("/ai") ? "#fff" : "#c084fc",
              background: active("/ai")
                ? "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(139,92,246,0.15))"
                : "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.06))",
              border: "1px solid " + (active("/ai") ? "rgba(168,85,247,0.5)" : "rgba(168,85,247,0.2)"),
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <span>🧠</span>
            <span>AI Coach</span>
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-bold"
              style={{ background: "rgba(168,85,247,0.3)", color: "#e9d5ff" }}>{aiBadge}</span>
          </a>

          <div className="mt-auto pt-4 flex flex-col gap-0.5">
            {bottomItems.map((item) => (
              <a key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                style={linkStyle(item.href)}
              >
                <span>{item.icon}</span><span>{item.label}</span>
              </a>
            ))}
          </div>
        </nav>

        <div className="mt-3 mb-2">
          <ThemeToggle />
        </div>

        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
