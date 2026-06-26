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
          <NavLink href="/dashboard" icon="⊞">Dashboard</NavLink>
          <NavLink href="/videos" icon="▶">Videos</NavLink>
          <NavLink href="/outlier" icon="⭐" badge="New">Outlier Score</NavLink>
          <NavLink href="/compare" icon="⚖">Compare</NavLink>
          <NavLink href="/settings" icon="⚙">Settings</NavLink>
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
