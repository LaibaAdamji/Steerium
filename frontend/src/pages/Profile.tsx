import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../api/client";
import type { Profile } from "../api/types";
import {
  Button,
  Card,
  Chip,
  ErrorBanner,
  PageHeader,
  Spinner,
} from "../components/ui";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Editable form fields (comma-separated for list inputs)
  const [name, setName] = useState("");
  const [degree, setDegree] = useState("");
  const [institution, setInstitution] = useState("");
  const [year, setYear] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [interestsText, setInterestsText] = useState("");
  const [goals, setGoals] = useState("");

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        setName(p.name ?? "");
        setDegree(p.education?.degree ?? "");
        setInstitution(p.education?.institution ?? "");
        setYear(p.education?.year ?? "");
        setSkillsText((p.skills ?? []).join(", "));
        setInterestsText((p.interests ?? []).join(", "));
        setGoals(p.career_goals ?? "");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await updateProfile({
        name: name.trim() || profile.name,
        education: {
          degree: degree.trim(),
          institution: institution.trim(),
          year: year.trim(),
        },
        skills: skillsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        interests: interestsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        career_goals: goals.trim() || null,
      });
      setProfile(updated);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  if (error && !profile) return <ErrorBanner message={error} />;
  if (!profile) return <Spinner label="Loading profile" />;

  const education = profile.education ?? {};
  const experience = profile.experience ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Career Profile"
        subtitle="The context Steerium uses to personalize everything"
        actions={
          editing ? (
            <>
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
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
      {saved && (
        <div className="mb-6 rounded-ai border border-sage/40 bg-sage/10 px-4 py-3 text-sm text-sage-dim">
          Profile updated.
        </div>
      )}

      {editing ? (
        <Card className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label-mono mb-1.5 block text-slate-ink">name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-focus w-full rounded-btn border border-hairline bg-card px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="label-mono mb-1.5 block text-slate-ink">expected year</span>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. Expected 2028"
                className="input-focus w-full rounded-btn border border-hairline bg-card px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="label-mono mb-1.5 block text-slate-ink">degree</span>
              <input
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="input-focus w-full rounded-btn border border-hairline bg-card px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="label-mono mb-1.5 block text-slate-ink">institution</span>
              <input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="input-focus w-full rounded-btn border border-hairline bg-card px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="label-mono mb-1.5 block text-slate-ink">skills (comma-separated)</span>
            <textarea
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              rows={2}
              className="input-focus w-full rounded-btn border border-hairline bg-card px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="label-mono mb-1.5 block text-slate-ink">
              interests (comma-separated)
            </span>
            <textarea
              value={interestsText}
              onChange={(e) => setInterestsText(e.target.value)}
              rows={2}
              className="input-focus w-full rounded-btn border border-hairline bg-card px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="label-mono mb-1.5 block text-slate-ink">career goals</span>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={3}
              className="input-focus w-full rounded-btn border border-hairline bg-card px-3 py-2 text-sm"
            />
          </label>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-6">
            <p className="label-mono mb-3 text-slate-ink">education</p>
            <p className="text-base font-semibold text-navy">{profile.name}</p>
            <p className="mt-1 text-sm text-slate-ink">
              {[education.degree, education.institution, education.year]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </Card>

          <Card className="p-6">
            <p className="label-mono mb-3 text-slate-ink">skills</p>
            <div className="flex flex-wrap gap-2">
              {(profile.skills ?? []).map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
              {(profile.skills ?? []).length === 0 && (
                <span className="text-sm text-slate-ink/70">—</span>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <p className="label-mono mb-3 text-slate-ink">experience</p>
            {experience.length === 0 ? (
              <span className="text-sm text-slate-ink/70">—</span>
            ) : (
              <ul className="space-y-4">
                {experience.map((exp, i) => (
                  <li key={i}>
                    <p className="text-sm font-medium text-navy">
                      {exp.title ?? "Role"}
                      <span className="font-normal text-slate-ink"> · {exp.org ?? "—"}</span>
                    </p>
                    {exp.dates && (
                      <p className="label-mono mt-0.5 text-[10px] text-slate-ink/60">{exp.dates}</p>
                    )}
                    {exp.description && (
                      <p className="mt-1 text-sm text-slate-ink">{exp.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <p className="label-mono mb-3 text-slate-ink">interests</p>
            <div className="flex flex-wrap gap-2">
              {(profile.interests ?? []).map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
              {(profile.interests ?? []).length === 0 && (
                <span className="text-sm text-slate-ink/70">—</span>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <p className="label-mono mb-3 text-slate-ink">career goals</p>
            <p className="text-sm leading-relaxed text-slate-ink">
              {profile.career_goals ?? "—"}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
