import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import ProfileSetupModal from "./ProfileSetupModal";
import { useToast } from "./Toast";
import { Avatar } from "./ui";

const WORKSPACE_NAV: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/opportunities", label: "Opportunities", icon: Compass },
  { to: "/applications", label: "Applications", icon: ClipboardList },
];

const KNOWLEDGE_NAV: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
];

const MOBILE_NAV = [
  ...WORKSPACE_NAV,
  { to: "/assistant", label: "AI", icon: Sparkles, end: false },
];

function SidebarLink({ to, label, icon: Icon, end }: { to: string; label: string; icon: LucideIcon; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-btn px-3 py-2 text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-sage/15 text-sage"
            : "text-white/65 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sage transition-all duration-200 ${
              isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
            }`}
          />
          <Icon
            size={16}
            className={`shrink-0 transition-transform duration-200 ${
              isActive ? "scale-110" : "group-hover:scale-110"
            }`}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [setupOpen, setSetupOpen] = useState(false);

  // Post-signup gate: Signup navigates here with profileSetup state. Open the
  // completion popup, then strip the state so refresh/back doesn't re-open it.
  useEffect(() => {
    if ((location.state as { profileSetup?: boolean } | null)?.profileSetup) {
      setSetupOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const displayName = profile?.name || user?.name || "You";

  async function handleLogout() {
    await logout();
    toast("Signed out. See you soon.");
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — the navy "OS chrome" */}
      <aside className="relative hidden w-64 shrink-0 flex-col overflow-hidden bg-navy md:flex">
        {/* Ambient sage glow bleeding in from the top */}
        <div className="pointer-events-none absolute -top-36 left-1/2 h-72 w-[160%] -translate-x-1/2 rounded-full bg-sage/[0.07] blur-3xl" />

        <div className="group relative flex items-center gap-3 px-6 pb-6 pt-7">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-sage/60 transition-colors duration-300 group-hover:border-sage">
            <Compass
              size={17}
              className="text-sage transition-transform duration-700 ease-out group-hover:rotate-[100deg]"
            />
          </span>
          <div>
            <p className="text-lg font-semibold leading-tight text-white">Steerium</p>
            <p className="label-mono text-[10px] text-sage">career os</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 px-3">
          <div>
            <p className="label-mono mb-2 px-3 text-[10px] text-white/40">workspace</p>
            <div className="space-y-0.5">
              {WORKSPACE_NAV.map((item) => (
                <SidebarLink key={item.to} {...item} />
              ))}
            </div>
          </div>
          <div>
            <p className="label-mono mb-2 px-3 text-[10px] text-white/40">knowledge</p>
            <div className="space-y-0.5">
              {KNOWLEDGE_NAV.map((item) => (
                <SidebarLink key={item.to} {...item} />
              ))}
            </div>
          </div>
        </nav>

        {/* User card + sign out */}
        <div className="relative border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-btn px-3 py-2.5 transition-colors duration-200 hover:bg-white/5">
            <NavLink to="/profile" className="flex min-w-0 flex-1 items-center gap-3" title="Profile settings">
              <Avatar name={displayName} size="md" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-white">{displayName}</span>
                <span className="block truncate font-mono text-[10px] text-white/50">
                  {user?.email}
                </span>
              </span>
            </NavLink>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-btn p-1.5 text-white/50 transition-all duration-200 hover:rotate-12 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={15} />
            </button>
          </div>
          <p className="label-mono px-3 pb-1 pt-2 text-[9px] text-white/30">v1.0 — demo build</p>
        </div>
      </aside>

      {/* Main workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sage/60 bg-navy">
              <Compass size={14} className="text-sage" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-none text-navy">Steerium</p>
              <p className="label-mono mt-0.5 text-[9px] text-slate-ink/70">career os</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/profile" aria-label="Profile settings" className="rounded-full">
              <Avatar name={displayName} size="sm" />
            </NavLink>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-btn border border-hairline text-slate-ink transition-colors hover:border-error/40 hover:text-error"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* Page content — keyed by path so every navigation plays the entrance */}
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-24 pt-6 md:px-10 md:pb-10 md:pt-8">
          <div key={location.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-hairline bg-card/95 backdrop-blur-sm md:hidden"
          aria-label="Primary"
        >
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="group flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={19}
                    className={`transition-all duration-200 ${
                      isActive
                        ? "-translate-y-0.5 scale-110 text-sage-dim"
                        : "text-slate-ink/60 group-hover:scale-105"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium transition-colors ${
                      isActive ? "text-sage-dim" : "text-slate-ink/60"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`h-0.5 w-6 rounded-full transition-all duration-200 ${
                      isActive ? "scale-x-100 bg-sage" : "scale-x-0 bg-transparent"
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Post-signup profile completion popup */}
      {setupOpen && <ProfileSetupModal onClose={() => setSetupOpen(false)} />}
    </div>
  );
}
