// Tag-style chip input — type and press Enter. Used for skills & interests.
import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

export default function ChipInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const value = raw.trim();
    if (!value || values.some((v) => v.toLowerCase() === value.toLowerCase())) return;
    onChange([...values, value]);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  const openSuggestions = suggestions.filter(
    (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div>
      <div className="input-focus flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-btn border border-hairline bg-card px-2.5 py-1.5 transition-colors">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full bg-eucalyptus/10 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide text-eucalyptus"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="text-eucalyptus/60 transition-colors hover:text-eucalyptus"
            >
              <X size={11} strokeWidth={3} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            add(draft);
            setDraft("");
          }}
          placeholder={values.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm text-navy-deep placeholder:text-slate-ink/50 focus:outline-none"
        />
      </div>
      {openSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {openSuggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-hairline px-2.5 py-1 font-mono text-[11px] text-slate-ink transition-colors hover:border-sage hover:text-sage-dim"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
