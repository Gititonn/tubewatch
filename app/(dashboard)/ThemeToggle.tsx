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
      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
      style={{ color: "var(--text-secondary)", background: "transparent" }}
    >
      <span>{isLight ? "☀️" : "🌙"}</span>
      <span>{isLight ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
