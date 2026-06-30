"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";

/**
 * Forces the page subtree to remount on every route change by keying it to the
 * pathname. Guards against stale client state bleeding across navigations
 * (URL updates but previous page's content/state lingers).
 */
export function RouteReset({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <Fragment key={pathname}>{children}</Fragment>;
}
