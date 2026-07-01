import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, isPaidPlan } from "@/lib/plan";
import { NavSections } from "./nav-sections";
import { MobileNav } from "./MobileNav";
import { RouteReset } from "./route-reset";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // AI Coach is a paid feature â€” label it honestly so free users see an upsell,
  // not a "NEW" freebie that 402s on click.
  const aiUnlocked = isPaidPlan(await getUserPlan(supabase, user.id));
  const aiBadge = aiUnlocked ? "NEW" : "PRO";

  return (
    <div className="min-h-screen lg:flex" style={{ background: "var(--bg)" }}>
      {/* Mobile/tablet header + drawer - hidden at lg+ */}
      <div className="lg:hidden">
        <MobileNav aiBadge={aiBadge} />
      </div>

      {/* Desktop sidebar - in-flow, shown at lg+ */}
      <aside
        className="hidden lg:flex w-56 flex-shrink-0 flex-col border-r py-6 px-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
      >
        <div className="mb-8 px-2">
          <Link href="/" className="text-lg font-black tracking-tight">
            <span style={{ color: "#ff3333" }}>Tube</span>
            <span style={{ color: "var(--accent)" }}>Watch</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          <NavSections aiBadge={aiBadge} />
        </nav>
      </aside>

      <main className="flex-1 overflow-auto" style={{ background: "var(--bg)" }}>
        <RouteReset>{children}</RouteReset>
      </main>
    </div>
  );
}

