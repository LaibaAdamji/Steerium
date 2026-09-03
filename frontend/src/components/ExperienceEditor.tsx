// Repeatable experience-entry editor — shared by the Profile page and the
// post-signup setup modal.
import { Plus, Trash2 } from "lucide-react";
import type { ExperienceItem } from "../api/types";
import { Button, Field, Input } from "./ui";

export default function ExperienceEditor({
  entries,
  onChange,
}: {
  entries: ExperienceItem[];
  onChange: (entries: ExperienceItem[]) => void;
}) {
  function update(i: number, patch: Partial<ExperienceItem>) {
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  return (
    <div className="space-y-4">
      {entries.map((exp, i) => (
        <div key={i} className="rounded-btn border border-hairline bg-canvas p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="label-mono text-[10px] text-slate-ink/60">entry {i + 1}</p>
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, idx) => idx !== i))}
              aria-label={`Remove experience entry ${i + 1}`}
              className="rounded-btn p-1 text-slate-ink/60 transition-colors hover:bg-error/10 hover:text-error"
            >
              <Trash2 size={13} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input
                value={exp.title ?? ""}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder="Software Engineering Intern"
              />
            </Field>
            <Field label="Organization">
              <Input
                value={exp.org ?? ""}
                onChange={(e) => update(i, { org: e.target.value })}
                placeholder="Acme Labs"
              />
            </Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
            <Field label="Dates">
              <Input
                value={exp.dates ?? ""}
                onChange={(e) => update(i, { dates: e.target.value })}
                placeholder="Summer 2026"
              />
            </Field>
            <Field label="What you did">
              <Input
                value={exp.description ?? ""}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder="Built and shipped internal tooling…"
              />
            </Field>
          </div>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() => onChange([...entries, { title: "", org: "", dates: "", description: "" }])}
      >
        <Plus size={14} />
        Add experience
      </Button>
    </div>
  );
}
