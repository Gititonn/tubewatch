"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = (href: string) => navIsActive(pathname, href);

  const linkStyle = (href: string): React.CSSProperties => ({
    color: active(href) ? "#00ff87" : "#888",
    background: active(href) ? "rgba(0,255,135,0.08)" : "transparent",
    fontWeight: active(href) ? 600 : 400,
    textDecoration: "none",
  });

  return (
    <>
      {/* Top sticky header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b"
        style={{ background: "#0a0a0a", borderColor: "#1a1a1a" }}
      >
        <span className="text-lg font-black tracking-tight">
          <span style={{ color: "#ff3333" }}>Tube</span>
          <span style={{ color: "#00ff87" }}>Watch</span>
        </span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-xl transition-colors hover:bg-white/5"
          style={{ color: "#888" }}
        >
          ☰
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-in drawer */}
      <div
        className="fixed top-0 left-0 z-50 h-full flex flex-col py-6 px-4"
        style={{
          width: "288px",
          background: "#0a0a0a",
          borderRight: "1px solid #1a1a1a",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "transform",
        }}
        aria-hidden={!open}
      >
        {/* Logo + close button */}
        <div className="mb-8 px-2 flex items-center justify-between">
          <span className="text-lg font-black tracking-tight">
            <span style={{ color: "#ff3333" }}>Tube</span>
            <span style={{ color: "#00ff87" }}>Watch</span>
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: "#666" }}
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
              style={linkStyle(item.href)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#2a2a2a" }}>
              Discover
            </span>
          </div>
          {discoverItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
              style={linkStyle(item.href)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#2a2a2a" }}>
              Analyze
            </span>
          </div>
          {analyzeItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
              style={linkStyle(item.href)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#2a2a2a" }}>
              AI
            </span>
          </div>
          {/* AI Coach — special purple styling */}
          <a
            href="/ai"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all"
            style={{
              color: active("/ai") ? "#fff" : "#c084fc",
              background: active("/ai")
                ? "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(139,92,246,0.15))"
                : "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.06))",
              border: `1px solid ${active("/ai") ? "rgba(168,85,247,0.5)" : "rgba(168,85,247,0.2)"}`,
              fontWeight: 700,
              boxShadow: active("/ai") ? "0 0 12px rgba(168,85,247,0.2)" : "none",
              textDecoration: "none",
            }}
          >
            <span>🧠</span>
            <span>AI Coach</span>
            <span
              className="ml-auto text-xs px-1.5 py-0.5 rounded font-bold"
              style={{ background: "rgba(168,85,247,0.3)", color: "#e9d5ff" }}
            >
              NEW
            </span>
          </a>

          <div className="mt-auto pt-4 flex flex-col gap-0.5">
            {bottomItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
                style={linkStyle(item.href)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </nav>

        {/* Sign out */}
        <form action="/api/auth/signout" method="POST" className="mt-4">
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/5"
            style={{ color: "#333" }}
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
