// Split-screen auth layout — navy brand panel + centered form column.
import type { ReactNode } from "react";
import { Compass } from "lucide-react";

const PANEL_POINTS = [
  "A living roadmap from where you are to where you want to be",
  "Opportunities matched to your skills, degree, and direction",
  "Your documents, one AI context away",
];

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Brand panel */}
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-navy p-10 lg:flex xl:p-14">
        {/* Backdrop: blueprint grid + drifting aurora + rotating compass watermark */}
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="animate-aurora pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sage/15 blur-3xl" />
        <div className="animate-aurora-rev pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-eucalyptus/15 blur-3xl" />
        <Compass
          size={280}
          strokeWidth={0.6}
          className="animate-spin-slower pointer-events-none absolute -bottom-20 -right-24 text-white/[0.05]"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/60 via-transparent to-transparent" />

        <div className="animate-fade-up group relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-sage/50 transition-colors duration-300 group-hover:border-sage">
            <Compass
              size={18}
              className="text-sage transition-transform duration-700 ease-out group-hover:rotate-[100deg]"
            />
          </span>
          <div>
            <p className="text-lg font-semibold leading-tight text-white">Steerium</p>
            <p className="label-mono text-[10px] text-sage">career os</p>
          </div>
        </div>

        <div className="relative">
          <p className="label-mono animate-fade-up mb-4 text-[10px] text-sage/80">
            your career operating system
          </p>
          <h2 className="font-display animate-fade-up max-w-md text-4xl font-semibold leading-tight tracking-tight text-white [animation-delay:100ms]">
            Your career, <span className="text-gradient-sage">in motion.</span>
          </h2>
          <ul className="mt-8 space-y-3.5">
            {PANEL_POINTS.map((point, i) => (
              <li
                key={point}
                className="animate-fade-up flex items-start gap-3 text-sm leading-relaxed text-white/70 transition-colors duration-200 hover:text-white"
                style={{ animationDelay: `${220 + i * 130}ms` }}
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage shadow-[0_0_8px_rgba(159,196,144,0.8)]" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="label-mono animate-fade-up relative text-[10px] text-white/40 [animation-delay:640ms]">
          built for students navigating what&rsquo;s next
        </p>
      </div>

      {/* Form column */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="animate-fade-up w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
