import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserPlan, isPaidPlan } from "@/lib/plan";
import { NavLink } from "./nav-link";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

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

  // AI Coach is a paid feature — label it honestly so free users see an upsell,
  // not a "NEW" freebie that 402s on click.
  const aiUnlocked = isPaidPlan(await getUserPlan(supabase, user.id));
  const aiBadge = aiUnlocked ? "NEW" : "PRO";

  return (
    <div className="min-h-screen md:flex" style={{ background: "var(--bg)" }}>
      {/* Mobile header + drawer - hidden on md+ */}
      <div className="md:hidden">
        <MobileNav aiBadge={aiBadge} />
      </div>

      {/* Desktop sidebar - hidden on mobile */}
      <aside
        className="hidden md:flex w-56 flex-shrink-0 flex-col border-r py-6 px-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-sidebar)" }}
      >
        <div className="mb-8 px-2">
          <span className="text-lg font-black tracking-tight">
            <span style={{ color: "#ff3333" }}>Tube</span>
            <span style={{ color: "var(--accent)" }}>Watch</span>
          </span>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          <NavLink href="/dashboard" icon="⊞">Dashboard</NavLink>
          <NavLink href="/videos" icon="▶">Videos</NavLink>

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--nav-label)" }}>Discover</span>
          </div>
          <NavLink href="/trending" icon="📈">Trending</NavLink>
          <NavLink href="/rising" icon="🚀">Rising</NavLink>
          <NavLink href="/competitors" icon="⚡">Competitors</NavLink>
          <NavLink href="/competitors/outliers" icon="🔥">Outlier Feed</NavLink>

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--nav-label)" }}>Analyze</span>
          </div>
          <NavLink href="/outlier" icon="⭐">Outlier Score</NavLink>
          <NavLink href="/patterns" icon="🎯">Patterns</NavLink>
          <NavLink href="/compare" icon="⚖">Compare</NavLink>

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--nav-label)" }}>AI</span>
          </div>
          <NavLink href="/ai" icon="🧠" ai badge={aiBadge}>AI Coach</NavLink>

          <div className="mt-auto pt-4 flex flex-col gap-0.5">
            <NavLink href="/billing" icon="💳">Billing</NavLink>
            <NavLink href="/settings" icon="⚙">Settings</NavLink>
          </div>
        </nav>
        <div className="mt-3 mb-2">
          <ThemeToggle />
        </div>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/5"
            style={{ color: "var(--text-muted)" }}
          >
            Sign out
          </button>
        </form>
      </aside>

      <main className="flex-1 overflow-auto" style={{ background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  );
}
