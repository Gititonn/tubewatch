"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { NavSections } from "./nav-sections";

export function MobileNav({ aiBadge = "NEW" }: { aiBadge?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b"
        style={{ background: "var(--bg-sidebar)", borderColor: "var(--border)" }}
      >
        <Link href="/dashboard" className="text-lg font-black tracking-tight">
          <span style={{ color: "#ff3333" }}>Tube</span>
          <span style={{ color: "var(--accent)" }}>Watch</span>
        </Link>
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
          <Link href="/dashboard" className="text-lg font-black tracking-tight" onClick={() => setOpen(false)}>
            <span style={{ color: "#ff3333" }}>Tube</span>
            <span style={{ color: "var(--accent)" }}>Watch</span>
          </Link>
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
          <NavSections aiBadge={aiBadge} />
        </nav>
      </div>
    </>
  );
}
