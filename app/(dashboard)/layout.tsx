import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "./nav-link";

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

  return (
    <div className="flex min-h-screen" style={{ background: "#0f0f0f" }}>
      <aside className="w-56 flex-shrink-0 flex flex-col border-r py-6 px-4" style={{ borderColor: "#2a2a2a", background: "#0f0f0f" }}>
        <div className="mb-8 px-2">
          <span className="text-lg font-bold" style={{ color: "#00ff87" }}>TubeWatch</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavLink href="/dashboard" icon="\u229e">Dashboard</NavLink>
          <NavLink href="/videos" icon="\u25b6">Videos</NavLink>
          <NavLink href="/trending" icon="\U0001f4c8">Trending</NavLink>
          <NavLink href="/rising" icon="\U0001f680">Rising</NavLink>
          <NavLink href="/competitors" icon="\u26a1">Competitors</NavLink>
          <NavLink href="/competitors/outliers" icon="\U0001f525">Outliers</NavLink>
          <NavLink href="/outlier" icon="\u2b50">Outlier Score</NavLink>
          <NavLink href="/compare" icon="\u2696">Compare</NavLink>
          <NavLink href="/patterns" icon="\U0001f3af">Patterns</NavLink>

          {/* AI Section */}
          <div className="mt-3 mb-1 px-2">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(168,85,247,0.5)" }}>
              AI Powered
            </span>
          </div>
          <NavLink href="/ai" icon="\U0001f9e0" ai badge="NEW">AI Insights</NavLink>

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest" style={{ color: "#333" }}>Account</span>
          </div>
          <NavLink href="/billing" icon="\U0001f4b3">Billing</NavLink>
          <NavLink href="/settings" icon="\u2699">Settings</NavLink>
        </nav>
        <form action="/api/auth/signout" method="POST">
          <button
            className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
            style={{ color: "#555" }}
          >
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
