import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  BarChart3,
  DollarSign,
  Filter,
  GitBranch,
  Layers,
  LineChart,
  LogOut,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Tag,
} from "lucide-react";
import { JunoMark } from "@/components/atoms/JunoMark";
import { cn } from "@/lib/cn";
import { useConsoleAuth } from "./AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: "/admin", label: "Overview", icon: <BarChart3 size={15} />, end: true },
  { to: "/admin/sessions", label: "Sessions", icon: <MessageSquare size={15} /> },
  { to: "/admin/pipeline", label: "Pipeline", icon: <GitBranch size={15} /> },
  { to: "/admin/cost", label: "Cost", icon: <DollarSign size={15} /> },
  { to: "/admin/latency", label: "Latency", icon: <Activity size={15} /> },
  { to: "/admin/quality", label: "Quality", icon: <ShieldAlert size={15} /> },
  { to: "/admin/funnel", label: "Funnel", icon: <LineChart size={15} /> },
  { to: "/admin/curation", label: "Curation", icon: <Tag size={15} /> },
  { to: "/admin/datasets", label: "Datasets", icon: <Sparkles size={15} /> },
  { to: "/admin/pricing", label: "Pricing", icon: <Layers size={15} /> },
];

export function ConsoleShell({ children }: { children: ReactNode }) {
  const auth = useConsoleAuth();
  return (
    <div className="min-h-screen bg-[color:var(--color-console-canvas)] text-text font-body">
      <div className="grid grid-cols-[240px_minmax(0,1fr)] min-h-screen">
        <aside className="border-r border-[color:var(--color-border)] bg-[color:var(--color-console-card)] sticky top-0 self-start h-screen flex flex-col">
          <div className="px-5 py-5 flex items-center gap-2">
            <JunoMark size={24} />
            <div className="leading-tight">
              <p className="font-display font-bold text-[15px] tracking-[-0.02em]">Juno Console</p>
              <p className="text-[11px] text-muted">Kapruka shopping agent</p>
            </div>
          </div>
          <nav className="flex-1 px-3 pb-3 overflow-auto scroll-quiet">
            <ul className="space-y-0.5">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-2 h-9 px-3 rounded-lg text-[13px] transition-colors",
                        isActive
                          ? "bg-[color:var(--color-cta-soft)] text-[color:var(--color-cta-deep)] font-semibold"
                          : "text-text hover:bg-[color:var(--color-console-sunken)]",
                      )
                    }
                  >
                    <Filter size={0} className="hidden" aria-hidden />
                    <span className="text-muted group-hover:text-text">{item.icon}</span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="px-3 py-3 border-t border-[color:var(--color-border)]">
            <div className="flex items-center justify-between gap-2 text-[12px] text-muted">
              <span className="truncate">{auth.email ?? "admin"}</span>
              <button
                type="button"
                onClick={() => auth.logout()}
                className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-[color:var(--color-console-sunken)] cursor-pointer"
                title="Log out"
              >
                <LogOut size={13} aria-hidden />
                Log out
              </button>
            </div>
          </div>
        </aside>
        <main className="px-6 py-6 max-w-[1400px] w-full">{children}</main>
      </div>
    </div>
  );
}
