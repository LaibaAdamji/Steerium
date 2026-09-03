// Post-signup profile completion popup — the gate between signup and the
// workspace. Users proceed either by saving the form or by explicitly
// choosing "Fill later"; the overlay itself is not dismissible (no backdrop
// click, no Escape, no close X).
import { useState, type ReactNode } from "react";
import { Briefcase, GraduationCap, Sparkles, User } from "lucide-react";
import { friendlyError, updateProfile } from "../api/client";
import type { ExperienceItem } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import ChipInput from "./ChipInput";
import ExperienceEditor from "./ExperienceEditor";
import { useToast } from "./Toast";
import { Button, Field, Input, SectionLabel, Textarea } from "./ui";

const SKILL_SUGGESTIONS = [
  "Python",
  "SQL",
  "Figma",
  "React",
  "Excel",
  "Data analysis",
  "Public speaking",
  "Spanish",
];

const INTEREST_SUGGESTIONS = [
  "AI",
  "Design",
  "Finance",
  "Research",
  "Sustainability",
  "Healthcare",
  "Education",
  "Entrepreneurship",
];

function ModalSection({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-slate-ink">
        {icon}
        <SectionLabel>{label}</SectionLabel>
      </div>
      {children}
    </section>
  );
}

export default function ProfileSetupModal({ onClose }: { onClose: () => void }) {
  const { profile, setProfile } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(profile?.name ?? "");
  const [institution, setInstitution] = useState(profile?.education?.institution ?? "");
  const [degree, setDegree] = useState(profile?.education?.degree ?? "");
  const [year, setYear] = useState(profile?.education?.year ?? "");
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [experience, setExperience] = useState<ExperienceItem[]>(profile?.experience ?? []);
  const [goals, setGoals] = useState(profile?.career_goals ?? "");

  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    if (!name.trim()) {
      setNameError("Tell us what to call you.");
      return;
    }
    setSaving(true);
    setError("");
    setNameError("");
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
      setProfile(updated);
      toast("Profile saved — your workspace is personalized.");
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  function fillLater() {
    toast("No problem — complete it anytime from the Profile page.");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/40 animate-[fade-in_150ms_ease-out]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set up your profile"
        className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-card border border-hairline bg-card shadow-focus animate-[modal-in_180ms_ease-out]"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-hairline px-6 py-5">
          <div className="flex items-center gap-2 text-sage-dim">
            <Sparkles size={14} />
            <SectionLabel className="text-sage-dim">welcome to steerium</SectionLabel>
          </div>
          <h2 className="font-display mt-2 text-xl font-semibold tracking-tight text-navy">
            Set up your profile
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-ink">
            This powers your roadmap, opportunity matching, and AI answers. You can refine it
            anytime from the Profile page.
          </p>
        </div>

        {/* Scrollable form */}
        <div className="space-y-6 overflow-y-auto px-6 py-5">
          {error && (
            <div
              role="alert"
              className="rounded-card border border-error/20 bg-error/5 px-4 py-3 text-sm text-error"
            >
              {error}
            </div>
          )}

          <ModalSection label="personal" icon={<User size={14} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={nameError || undefined}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ayesha Khan"
                  autoFocus
                  invalid={!!nameError}
                />
              </Field>
              <Field label="Expected graduation" hint="e.g. Expected 2028">
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Expected 2028"
                />
              </Field>
            </div>
          </ModalSection>

          <ModalSection label="education" icon={<GraduationCap size={14} />}>
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
          </ModalSection>

          <ModalSection label="skills">
            <ChipInput
              values={skills}
              onChange={setSkills}
              placeholder="Python, Figma, SQL…"
              suggestions={SKILL_SUGGESTIONS}
            />
          </ModalSection>

          <ModalSection label="experience" icon={<Briefcase size={14} />}>
            <ExperienceEditor entries={experience} onChange={setExperience} />
          </ModalSection>

          <ModalSection label="interests">
            <ChipInput
              values={interests}
              onChange={setInterests}
              placeholder="AI, design, research…"
              suggestions={INTEREST_SUGGESTIONS}
            />
          </ModalSection>

          <ModalSection label="career direction">
            <Field label="Where are you headed?" hint="This steers roadmaps, matches, and AI guidance.">
              <Textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={3}
                placeholder="Pursue a funded Master's in CS abroad, specializing in AI/ML…"
              />
            </Field>
          </ModalSection>
        </div>

        {/* Footer — the only two ways out */}
        <div className="shrink-0 border-t border-hairline bg-canvas/60 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={fillLater} disabled={saving}>
              Fill later
            </Button>
            <Button onClick={save} loading={saving}>
              Save profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
