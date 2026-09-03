import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { friendlyError } from "../api/client";
import AuthShell from "../components/AuthShell";
import { Button, Field, Input } from "../components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Tell us what to call you.";
    if (!email.trim()) errs.email = "An email is required.";
    else if (!EMAIL_RE.test(email.trim())) errs.email = "That email doesn't look right.";
    if (password.length < 8) errs.password = "Use at least 8 characters.";
    if (confirm !== password) errs.confirm = "Passwords don't match.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await signup({ name: name.trim(), email: email.trim(), password });
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
        Create your account
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-ink">
        One workspace for your roadmap, opportunities, and documents.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-card border border-error/20 bg-error/5 px-4 py-3 text-sm text-error"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Full name" error={fieldErrors.name}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ayesha Khan"
            autoComplete="name"
            invalid={!!fieldErrors.name}
          />
        </Field>

        <Field label="Email" error={fieldErrors.email}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            autoComplete="email"
            invalid={!!fieldErrors.email}
          />
        </Field>

        <Field label="Password" error={fieldErrors.password} hint="At least 8 characters.">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="pr-10"
              invalid={!!fieldErrors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-ink/60 transition-colors hover:text-navy"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <Field label="Confirm password" error={fieldErrors.confirm}>
          <Input
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            invalid={!!fieldErrors.confirm}
          />
        </Field>

        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-ink">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-sage-dim underline-offset-4 transition-colors hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
