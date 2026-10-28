import { Compass, MessageSquareText, PlusCircle, Shield, UserRound } from "lucide-react";
import { NavLink, Outlet, Link } from "react-router";
import { COPYRIGHT } from "@shared/lib/legalContent";
import { useAuth } from "../lib/auth";
import { BrandHeader } from "./Brand";

function useTabs() {
  const { user } = useAuth();
  const tabs = [
    { to: "/", label: "Discover", icon: Compass, end: true },
    { to: "/reviews", label: "Reviews", icon: MessageSquareText },
    { to: "/suggest", label: "Suggest", icon: PlusCircle },
    { to: "/profile", label: user ? "Profile" : "Sign in", icon: UserRound },
  ];
  if (user?.role === "admin") tabs.push({ to: "/admin", label: "Admin", icon: Shield });
  return tabs;
}

export function Layout() {
  const tabs = useTabs();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-[1000] border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <BrandHeader />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-secondary text-secondary-fg" : "text-muted-fg hover:bg-muted hover:text-fg"}`
                }
              >
                <t.icon size={18} />
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:pb-12">
        <Outlet />
      </main>

      <footer className="border-t border-border pb-24 md:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-fg md:flex-row md:items-center md:justify-between">
          <p>18+ only. Information guide only: no sales, orders, payments or deliveries.</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legal">
            <Link to="/privacy" className="hover:text-fg">Privacy</Link>
            <Link to="/terms" className="hover:text-fg">Terms</Link>
            <Link to="/community-rules" className="hover:text-fg">Community Rules</Link>
            <Link to="/support" className="hover:text-fg">Support</Link>
            <Link to="/delete-account" className="hover:text-fg">Delete account</Link>
          </nav>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-6 text-xs text-muted-fg">{COPYRIGHT}</p>
      </footer>

      {/* Phone-style bottom tab bar on small screens */}
      <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-border bg-card/95 backdrop-blur md:hidden" aria-label="Tabs">
        <div className="mx-auto flex max-w-lg justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? "text-primary" : "text-muted-fg"}`}
            >
              <t.icon size={22} />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
