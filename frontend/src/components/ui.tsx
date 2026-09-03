// Small shared UI primitives styled per the Steerium design system.
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-hairline bg-card ${className}`}>{children}</div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-ink">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-12 text-slate-ink">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-hairline border-t-sage" />
      <span className="label-mono">{label}…</span>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-6 rounded-card border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
      {message}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-hairline bg-card py-14">
      <p className="text-sm font-medium text-slate-ink">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-ink/70">{hint}</p>}
    </div>
  );
}

/** Sage-primary button (navy text) per design spec; secondary = white/slate. */
export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const variants = {
    primary: "bg-sage text-navy hover:bg-moss disabled:opacity-50",
    secondary:
      "border border-slate-ink/40 bg-card text-slate-ink hover:border-slate-ink disabled:opacity-50",
    ghost: "text-slate-ink hover:bg-hairline/50 disabled:opacity-50",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-btn px-4 py-2 text-sm font-semibold transition-colors ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Eucalyptus chip for skills/tags (10% bg, full-color text). */
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-eucalyptus/10 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide text-eucalyptus">
      {children}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  interested: "bg-eucalyptus/10 text-eucalyptus",
  preparing: "bg-[#031c39]/5 text-[#334767]",
  applied: "bg-sage/15 text-sage-dim",
  interview: "bg-moss/25 text-[#2f4e26]",
  accepted: "bg-sage text-navy",
  rejected: "bg-error/10 text-error",
  active: "bg-sage/15 text-sage-dim",
  completed: "bg-moss/25 text-[#2f4e26]",
  paused: "bg-hairline text-slate-ink",
  not_started: "bg-hairline text-slate-ink",
  in_progress: "bg-eucalyptus/15 text-eucalyptus",
  high: "bg-error/10 text-error",
  medium: "bg-eucalyptus/15 text-eucalyptus",
  low: "bg-hairline text-slate-ink",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-hairline text-slate-ink";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/** Moss fill on light track, per design spec. */
export function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-separator">
      <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}
