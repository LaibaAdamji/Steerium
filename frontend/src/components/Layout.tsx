import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/applications", label: "Applications" },
  { to: "/documents", label: "Documents" },
  { to: "/assistant", label: "AI Assistant" },
  { to: "/profile", label: "Profile" },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — the navy "OS chrome" */}
      <aside className="hidden w-60 shrink-0 flex-col bg-navy text-white md:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-sage/60">
            <span className="h-2.5 w-2.5 rounded-full bg-sage" />
          </span>
          <div>
            <p className="text-lg font-semibold leading-tight">Steerium</p>
            <p className="label-mono text-[10px] text-sage">career os</p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-btn px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-sage"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <p className="label-mono px-6 py-4 text-[10px] text-white/40">v0.1 — mvp</p>
      </aside>

      {/* Main workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-hairline bg-navy px-4 py-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-btn px-3 py-1.5 text-xs font-medium ${
                  isActive ? "bg-white/10 text-sage" : "text-white/70"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 md:px-10 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
