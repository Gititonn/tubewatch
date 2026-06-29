"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const html = document.documentElement;
    if (html.classList.contains("light")) {
      html.classList.remove("light");
      localStorage.setItem("tw-theme", "dark");
      setIsLight(false);
    } else {
      html.classList.add("light");
      localStorage.setItem("tw-theme", "light");
      setIsLight(true);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "transparent",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
        Theme
      </span>
      <span style={{ fontSize: 14 }}>{isLight ? "☀️" : "🌙"}</span>
    </button>
  );
}
