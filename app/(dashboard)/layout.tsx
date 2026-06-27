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
      <aside className="w-56 flex-shrink-0 flex flex-col border-r py-6 px-4" style={{ borderColor: "#1a1a1a", background: "#0a0a0a" }}>
        <div className="mb-8 px-2">
          <span className="text-lg font-black tracking-tight" style={{ color: "#00ff87" }}>TubeWatch</span>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          <NavLink href="/dashboard" icon="⊞">Dashboard</NavLink>
          <NavLink href="/videos" icon="▶">Videos</NavLink>

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#2a2a2a" }}>Discover</span>
          </div>
          <NavLink href="/trending" icon="📈">Trending</NavLink>
          <NavLink href="/rising" icon="🚀">Rising</NavLink>
          <NavLink href="/competitors" icon="⚡">Competitors</NavLink>
          <NavLink href="/competitors/outliers" icon="🔥">Outlier Feed</NavLink>

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#2a2a2a" }}>Analyze</span>
          </div>
          <NavLink href="/outlier" icon="⭐">Outlier Score</NavLink>
          <NavLink href="/patterns" icon="🎯">Patterns</NavLink>
          <NavLink href="/compare" icon="⚖">Compare</NavLink>

          <div className="mt-3 mb-1 px-2">
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#2a2a2a" }}>AI</span>
          </div>
          <NavLink href="/ai" icon="🧠" ai badge="NEW">AI Coach</NavLink>

          <div className="mt-auto pt-4 flex flex-col gap-0.5">
            <NavLink href="/billing" icon="💳">Billing</NavLink>
            <NavLink href="/settings" icon="⚙">Settings</NavLink>
          </div>
        </nav>
        <form action="/api/auth/signout" method="POST" className="mt-4">
          <button
            className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/5"
            style={{ color: "#333" }}
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
