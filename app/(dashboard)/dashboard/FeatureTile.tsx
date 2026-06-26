"use client";
import Link from "next/link";
import { useState } from "react";

type Props = {
  href: string;
  icon: string;
  label: string;
  desc: string;
  accent: string;
  bg: string;
  border: string;
  glow: string;
};

export default function FeatureTile({ href, icon, label, desc, accent, bg, border, glow }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href}>
      <div
        className="rounded-xl border p-4 h-full cursor-pointer transition-all"
        style={{
          borderColor: hovered ? accent + "55" : border,
          background: bg,
          boxShadow: hovered ? `0 4px 24px ${glow}` : "none",
          transform: hovered ? "scale(1.03)" : "scale(1)",
          transition: "all 0.18s ease",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="text-2xl mb-2">{icon}</div>
        <div className="font-bold text-sm mb-1" style={{ color: accent }}>
          {label}
        </div>
        <div className="text-xs leading-relaxed" style={{ color: "#555" }}>
          {desc}
        </div>
      </div>
    </Link>
  );
}
