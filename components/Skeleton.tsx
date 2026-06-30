import React from "react";

/** Theme-aware shimmer block. Compose these to mirror real content layout. */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`tw-skeleton ${className}`} style={style} aria-hidden="true" />;
}

/** Card placeholder that mirrors the Outlier Feed / video grid card. */
export function VideoCardSkeleton() {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <Skeleton style={{ width: "100%", paddingBottom: "56.25%", borderRadius: 0 }} />
      <div className="p-3">
        <Skeleton style={{ height: 14, width: "92%", marginBottom: 8 }} />
        <Skeleton style={{ height: 14, width: "70%", marginBottom: 14 }} />
        <div className="flex items-center gap-2 mb-3">
          <Skeleton style={{ height: 20, width: 20, borderRadius: 9999 }} />
          <Skeleton style={{ height: 12, width: 90 }} />
        </div>
        <Skeleton style={{ height: 28, width: "100%" }} />
      </div>
    </div>
  );
}

/** Grid of card skeletons sized to match the feed grid. */
export function VideoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** A single skeleton row matching the Outlier Score table layout. */
export function TableRowSkeleton() {
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton style={{ height: 36, width: 64, flexShrink: 0 }} />
          <Skeleton style={{ height: 14, width: "70%" }} />
        </div>
      </td>
      <td className="px-4 py-3"><Skeleton style={{ height: 12, width: 70, marginLeft: "auto" }} /></td>
      <td className="px-4 py-3"><Skeleton style={{ height: 12, width: 50, marginLeft: "auto" }} /></td>
      <td className="px-4 py-3"><Skeleton style={{ height: 12, width: 50, marginLeft: "auto" }} /></td>
      <td className="px-4 py-3"><Skeleton style={{ height: 22, width: 56, marginLeft: "auto", borderRadius: 9999 }} /></td>
      <td className="px-4 py-3"><Skeleton style={{ height: 28, width: 64, marginLeft: "auto" }} /></td>
    </tr>
  );
}
