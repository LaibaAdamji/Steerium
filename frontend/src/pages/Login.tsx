import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { friendlyError } from "../api/client";
import AuthShell from "../components/AuthShell";
import { Button, Field, Input } from "../components/ui";

// Mirrors the backend DEMO_EMAIL / DEMO_PASSWORD defaults (see README).
const DEMO_EMAIL = "demo@steerium.app";
const DEMO_PASSWORD = "steerium-demo-2026";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!email.trim() || !password) {
      setError("Enter your email and password to sign in.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">Welcome back</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-ink">
        Sign in to pick up your roadmap right where you left it.
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
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            autoComplete="email"
            autoFocus
          />
        </Field>

        <Field label="Password">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-10"
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

        <Button type="submit" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setEmail(DEMO_EMAIL);
          setPassword(DEMO_PASSWORD);
          setError("");
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-btn border border-dashed border-hairline px-4 py-2.5 text-xs text-slate-ink transition-colors hover:border-sage hover:text-sage-dim"
      >
        <Sparkles size={13} />
        Fill demo account — explore a seeded workspace
      </button>

      <p className="mt-8 text-center text-sm text-slate-ink">
        New to Steerium?{" "}
        <Link
          to="/signup"
          className="font-semibold text-sage-dim underline-offset-4 transition-colors hover:underline"
        >
          Create your account
        </Link>
      </p>
    </AuthShell>
  );
}
