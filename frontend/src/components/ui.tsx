// Small shared UI primitives styled per the Steerium design system.
import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Check, X } from "lucide-react";

// --- Surfaces ---

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-hairline bg-card transition-all duration-200 ${
        interactive ? "cursor-pointer hover:-translate-y-0.5 hover:border-sage hover:shadow-focus" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="label-mono mb-1.5 text-[10px] text-sage-dim">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-ink">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`label-mono text-[10px] text-slate-ink ${className}`}>{children}</p>;
}

// --- Feedback ---

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

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-hairline bg-card px-6 py-14 text-center">
      {icon && (
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-sage/10 text-sage-dim">
          {icon}
        </span>
      )}
      <p className="text-sm font-semibold text-navy">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-ink/80">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-btn ${className}`} />;
}

export function SkeletonCard({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <Card className={`p-5 ${className}`}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-5 w-3/4" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </Card>
  );
}

// --- Buttons ---

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

/** Sage-primary button (navy text) per design spec; secondary = white/slate. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, variant = "primary", loading = false, disabled, className = "", ...rest },
  ref,
) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-sage text-navy hover:bg-moss active:translate-y-px disabled:hover:bg-sage",
    secondary:
      "border border-slate-ink/40 bg-card text-slate-ink hover:border-slate-ink hover:bg-canvas active:translate-y-px",
    ghost: "text-slate-ink hover:bg-hairline/50",
    danger: "border border-error/30 bg-card text-error hover:bg-error/5",
  };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-btn px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-navy/30 border-t-navy" />
      )}
      {children}
    </button>
  );
});

// --- Form controls ---

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label-mono mb-1.5 block text-slate-ink">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-error">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-slate-ink/60">{hint}</span>
      ) : null}
    </label>
  );
}

const inputClasses =
  "w-full rounded-btn border border-hairline bg-card px-3 py-2 text-sm text-navy-deep placeholder:text-slate-ink/50 transition-colors";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className = "", invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`input-focus ${inputClasses} ${invalid ? "border-error focus:border-error focus:ring-error/20" : ""} ${className}`}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className = "", invalid, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={`input-focus ${inputClasses} ${invalid ? "border-error focus:border-error focus:ring-error/20" : ""} ${className}`}
      {...rest}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={`input-focus ${inputClasses} cursor-pointer font-mono text-xs uppercase tracking-wide text-navy ${className}`}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

// --- Data display ---

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
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

/** Moss fill on light track, per design spec. Fills in on mount. */
export function ProgressBar({ value, animate = false }: { value: number; animate?: boolean }) {
  const pct = Math.min(100, Math.max(0, value));
  const [width, setWidth] = useState(animate ? 0 : pct);

  useEffect(() => {
    if (!animate) {
      setWidth(pct);
      return;
    }
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct, animate]);

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-separator"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-moss transition-[width] duration-700 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-navy font-mono font-semibold tracking-wide text-sage ${sizes[size]}`}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

/** Animated completion checkbox. */
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-btn border transition-all duration-200 ${
        checked
          ? "border-moss bg-moss text-navy"
          : "border-hairline bg-card text-transparent hover:scale-105 hover:border-sage"
      }`}
    >
      <Check size={12} strokeWidth={3} />
    </button>
  );
}

// --- Modal ---

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/40 animate-[fade-in_150ms_ease-out]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-card border border-hairline bg-card p-6 shadow-focus animate-[modal-in_180ms_ease-out]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-btn p-1 text-slate-ink transition-colors hover:bg-hairline/60 hover:text-navy"
          >
            <X size={16} />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// --- Date helpers ---

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

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "GOOD EVENING";
  if (h < 12) return "GOOD MORNING";
  if (h < 18) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}
