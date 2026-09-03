import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Compass, Target } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { createGoal, friendlyError, updateProfile } from "../api/client";
import ChipInput from "../components/ChipInput";
import { useToast } from "../components/Toast";
import { Button, Field, Input, Textarea } from "../components/ui";

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

export default function OnboardingPage() {
  const { profile, refreshUser, setProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 — profile context
  const [name, setName] = useState(profile?.name ?? "");
  const [institution, setInstitution] = useState(profile?.education?.institution ?? "");
  const [degree, setDegree] = useState(profile?.education?.degree ?? "");
  const [year, setYear] = useState(profile?.education?.year ?? "");
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);

  // Step 2 — first goal
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [saving, setSaving] = useState(false);

  async function persistProfile() {
    const education: Record<string, string> = {};
    if (institution.trim()) education.institution = institution.trim();
    if (degree.trim()) education.degree = degree.trim();
    if (year.trim()) education.year = year.trim();

    const updated = await updateProfile({
      name: name.trim() || (profile?.name ?? "You"),
      education,
      skills,
      interests,
    });
    setProfile(updated);
  }

  function goToStep2() {
    if (!name.trim()) {
      setFieldError("Tell us what to call you.");
      return;
    }
    setFieldError("");
    setStep(2);
  }

  async function finish(withGoal: boolean) {
    if (saving) return;
    if (withGoal && !goalTitle.trim()) {
      setFieldError("Give your goal a name — e.g. “Land a summer internship”.");
      return;
    }
    setFieldError("");
    setError("");
    setSaving(true);
    try {
      await persistProfile();
      if (withGoal) {
        await createGoal({
          title: goalTitle.trim(),
          description: goalDescription.trim() || null,
          target_date: targetDate || null,
        });
      }
      await refreshUser();
      toast("Workspace ready — welcome to Steerium.");
      navigate("/", { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 md:py-16">
      <div className="mx-auto w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-sage/60 bg-navy">
              <Compass size={18} className="text-sage" />
            </span>
            <div>
              <p className="font-semibold leading-tight text-navy">Steerium</p>
              <p className="label-mono text-[10px] text-slate-ink/70">setup</p>
            </div>
          </div>
          <Link
            to="/"
            className="text-xs text-slate-ink/60 underline-offset-4 transition-colors hover:text-navy hover:underline"
          >
            Skip setup
          </Link>
        </div>

        {/* Step indicator */}
        <div className="mb-6">
          <p className="label-mono mb-2 text-[10px] text-slate-ink/70">
            step {step} of 2 — {step === 1 ? "your profile" : "your first goal"}
          </p>
          <div className="flex gap-1.5">
            <div
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                step >= 1 ? "bg-sage" : "bg-hairline"
              }`}
            />
            <div
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                step >= 2 ? "bg-sage" : "bg-hairline"
              }`}
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-card border border-error/20 bg-error/5 px-4 py-3 text-sm text-error"
          >
            {error}
          </div>
        )}

        {step === 1 ? (
          <div className="rounded-card border border-hairline bg-card p-6 animate-[fade-in_240ms_ease-out] md:p-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-navy">
              Let&rsquo;s set up your profile
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-ink">
              This powers your roadmap, opportunity matching, and AI answers. You can refine it
              anytime from Profile.
            </p>

            <div className="mt-6 space-y-4">
              <Field label="Full name" error={fieldError || undefined}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ayesha Khan"
                  autoFocus
                  invalid={!!fieldError}
                />
              </Field>

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

              <Field label="Expected graduation" hint="e.g. Expected 2028">
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Expected 2028"
                />
              </Field>

              <Field label="Skills" hint="Press Enter to add each skill.">
                <ChipInput
                  values={skills}
                  onChange={setSkills}
                  placeholder="Python, Figma, SQL…"
                  suggestions={SKILL_SUGGESTIONS}
                />
              </Field>

              <Field label="Interests" hint="Areas you want to grow toward.">
                <ChipInput
                  values={interests}
                  onChange={setInterests}
                  placeholder="AI, design, research…"
                  suggestions={INTEREST_SUGGESTIONS}
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={goToStep2}>
                Continue
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-card border border-hairline bg-card p-6 animate-[fade-in_240ms_ease-out] md:p-8">
            <div className="flex items-center gap-2 text-sage-dim">
              <Target size={16} />
              <p className="label-mono text-[10px]">goal</p>
            </div>
            <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight text-navy">
              What are you working toward?
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-ink">
              Steerium turns one goal into a full roadmap — milestones, tasks, and why each step
              matters — in seconds.
            </p>

            <div className="mt-6 space-y-4">
              <Field label="Your goal" error={fieldError || undefined}>
                <Input
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Land a software engineering internship this summer"
                  autoFocus
                  invalid={!!fieldError}
                />
              </Field>

              <Field
                label="Add context (optional)"
                hint="Constraints, preferences, location — anything that sharpens the roadmap."
              >
                <Textarea
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  rows={3}
                  placeholder="I'm interested in AI/ML roles and want to stay in Europe…"
                />
              </Field>

              <Field label="Target date (optional)">
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </Field>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft size={15} />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => finish(false)}
                  disabled={saving}
                  className="text-xs text-slate-ink/60 underline-offset-4 transition-colors hover:text-navy hover:underline disabled:opacity-50"
                >
                  Skip — I&rsquo;ll add a goal later
                </button>
                <Button onClick={() => finish(true)} loading={saving}>
                  <Check size={15} />
                  Create goal & enter
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
