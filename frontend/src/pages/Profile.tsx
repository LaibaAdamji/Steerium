import { useEffect, useState } from "react";
import { Briefcase, GraduationCap, Plus, Trash2, User, X } from "lucide-react";
import { friendlyError, getProfile, updateProfile } from "../api/client";
import type { ExperienceItem, Profile as ProfileType } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ChipInput from "../components/ChipInput";
import { useToast } from "../components/Toast";
import {
  Button,
  Card,
  Chip,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Skeleton,
  SkeletonCard,
  Textarea,
} from "../components/ui";

function SectionCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2 text-slate-ink">
        {icon}
        <p className="label-mono text-[10px]">{label}</p>
      </div>
      {children}
    </Card>
  );
}

function ExperienceEditor({
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

export default function ProfilePage() {
  const { setProfile } = useAuth();
  const { toast } = useToast();

  const [profile, setProfileState] = useState<ProfileType | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Editable form state
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [degree, setDegree] = useState("");
  const [year, setYear] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [goals, setGoals] = useState("");

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfileState(p);
        hydrate(p);
      })
      .catch((err) => setError(friendlyError(err)));
  }, []);

  function hydrate(p: ProfileType) {
    setName(p.name ?? "");
    setInstitution(p.education?.institution ?? "");
    setDegree(p.education?.degree ?? "");
    setYear(p.education?.year ?? "");
    setSkills(p.skills ?? []);
    setInterests(p.interests ?? []);
    setExperience(p.experience ?? []);
    setGoals(p.career_goals ?? "");
  }

  const save = async () => {
    if (!profile || saving) return;
    if (!name.trim()) {
      setError("Your name can't be empty.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const education: Record<string, string> = {};
      if (institution.trim()) education.institution = institution.trim();
      if (degree.trim()) education.degree = degree.trim();
      if (year.trim()) education.year = year.trim();

      const updated = await updateProfile({
        name: name.trim(),
        education,
        skills,
        interests,
        experience: experience.filter((e) => (e.title ?? "").trim() || (e.org ?? "").trim()),
        career_goals: goals.trim() || null,
      });
      setProfileState(updated);
      setProfile(updated); // keep the auth context in sync
      setEditing(false);
      toast("Profile saved.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  if (error && !profile) return <ErrorBanner message={error} />;
  if (!profile)
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-2/5" />
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );

  const education = profile.education ?? {};
  const experienceList = profile.experience ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="settings"
        title="Career Profile"
        subtitle="The context Steerium uses to personalize everything"
        actions={
          editing ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  hydrate(profile);
                  setEditing(false);
                  setError("");
                }}
                disabled={saving}
              >
                <X size={14} />
                Cancel
              </Button>
              <Button onClick={save} loading={saving}>
                Save changes
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Edit profile
            </Button>
          )
        }
      />

      {error && <ErrorBanner message={error} />}

      {editing ? (
        <div className="space-y-6">
          <SectionCard label="personal" icon={<User size={14} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Expected graduation" hint="e.g. Expected 2028">
                <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Expected 2028" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard label="education" icon={<GraduationCap size={14} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Institution">
                <Input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="FAST-NUCES"
                />
              </Field>
              <Field label="Degree">
                <Input
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="BS Computer Science"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard label="skills">
            <ChipInput
              values={skills}
              onChange={setSkills}
              placeholder="Python, Figma, SQL…"
              suggestions={["Python", "SQL", "Figma", "React", "Excel", "Data analysis"]}
            />
          </SectionCard>

          <SectionCard label="experience" icon={<Briefcase size={14} />}>
            <ExperienceEditor entries={experience} onChange={setExperience} />
          </SectionCard>

          <SectionCard label="interests">
            <ChipInput
              values={interests}
              onChange={setInterests}
              placeholder="AI, design, research…"
              suggestions={["AI", "Design", "Finance", "Research", "Sustainability"]}
            />
          </SectionCard>

          <SectionCard label="career direction">
            <Field label="Where are you headed?" hint="This steers roadmaps, matches, and AI guidance.">
              <Textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={3}
                placeholder="Pursue a funded Master's in CS abroad, specializing in AI/ML…"
              />
            </Field>
          </SectionCard>
        </div>
      ) : (
        <div className="space-y-6">
          <SectionCard label="personal" icon={<User size={14} />}>
            <p className="text-base font-semibold text-navy">{profile.name}</p>
            <p className="mt-1 text-sm text-slate-ink">
              {[education.degree, education.institution, education.year].filter(Boolean).join(" · ") ||
                "Add your education to unlock better matches."}
            </p>
          </SectionCard>

          <SectionCard label="skills">
            <div className="flex flex-wrap gap-2">
              {(profile.skills ?? []).map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
              {(profile.skills ?? []).length === 0 && (
                <span className="text-sm text-slate-ink/70">—</span>
              )}
            </div>
          </SectionCard>

          <SectionCard label="experience" icon={<Briefcase size={14} />}>
            {experienceList.length === 0 ? (
              <span className="text-sm text-slate-ink/70">—</span>
            ) : (
              <ul className="space-y-4">
                {experienceList.map((exp, i) => (
                  <li key={i}>
                    <p className="text-sm font-medium text-navy">
                      {exp.title ?? "Role"}
                      <span className="font-normal text-slate-ink"> · {exp.org ?? "—"}</span>
                    </p>
                    {exp.dates && (
                      <p className="label-mono mt-0.5 text-[10px] text-slate-ink/60">{exp.dates}</p>
                    )}
                    {exp.description && (
                      <p className="mt-1 text-sm leading-relaxed text-slate-ink">{exp.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard label="interests">
            <div className="flex flex-wrap gap-2">
              {(profile.interests ?? []).map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
              {(profile.interests ?? []).length === 0 && (
                <span className="text-sm text-slate-ink/70">—</span>
              )}
            </div>
          </SectionCard>

          <SectionCard label="career direction">
            <p className="text-sm leading-relaxed text-slate-ink">{profile.career_goals ?? "—"}</p>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
