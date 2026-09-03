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
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sage/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-eucalyptus/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-sage/50">
            <Compass size={18} className="text-sage" />
          </span>
          <div>
            <p className="text-lg font-semibold leading-tight text-white">Steerium</p>
            <p className="label-mono text-[10px] text-sage">career os</p>
          </div>
        </div>

        <div className="relative">
          <p className="label-mono mb-4 text-[10px] text-sage/80">your career operating system</p>
          <h2 className="font-display max-w-md text-4xl font-semibold leading-tight tracking-tight text-white">
            Your career, in motion.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {PANEL_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-sm leading-relaxed text-white/70"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="label-mono relative text-[10px] text-white/40">
          built for students navigating what&rsquo;s next
        </p>
      </div>

      {/* Form column */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-[fade-in_240ms_ease-out]">{children}</div>
      </div>
    </div>
  );
}
