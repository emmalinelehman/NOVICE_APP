import { useState, type FormEvent } from "react";
import { ArrowRight, Users } from "lucide-react";
import * as api from "@/lib/api";
import { welcomePhoto } from "@/lib/photos";
import { Button, ErrorBanner, Field, Logo } from "@/components/ui";

export function AuthScreen() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (mode === "signup" && !name.trim()) return setError("Add your first name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Use a password with at least 6 characters.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { needsConfirmation } = await api.signUp(email.trim(), password, name.trim());
        if (needsConfirmation) {
          setNotice("Check your email to confirm your account, then sign in here.");
          setMode("signin");
        }
      } else {
        await api.signIn(email.trim(), password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <header>
        <Logo />
      </header>
      <div className="auth-layout">
        <section className="auth-copy">
          <p className="eyebrow">Ann Arbor beta</p>
          <h1>Be new at something, together.</h1>
          <p className="lede">
            Keep a list of things you&rsquo;ve never done, see who nearby wants to try the same
            thing, and make a real plan with other beginners.
          </p>
          <div className="auth-photo">
            <img src={welcomePhoto} alt="Beginners carrying kayaks to the water together" />
            <div>
              <Users size={18} />
              <span>No experience needed. Everyone here is new at something.</span>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="tabs" role="tablist">
            <button
              role="tab"
              aria-selected={mode === "signup"}
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Create account
            </button>
            <button
              role="tab"
              aria-selected={mode === "signin"}
              className={mode === "signin" ? "active" : ""}
              onClick={() => {
                setMode("signin");
                setError("");
              }}
            >
              Sign in
            </button>
          </div>
          <form onSubmit={submit} noValidate>
            {mode === "signup" && (
              <Field label="First name" hint="Other people only see this if you join a plan.">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="given-name"
                  maxLength={40}
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
              />
            </Field>
            <Field
              label="Password"
              hint={mode === "signup" ? "At least 6 characters." : undefined}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </Field>
            {error && <ErrorBanner message={error} />}
            {notice && <p className="auth-notice">{notice}</p>}
            <Button type="submit" busy={busy} className="full">
              {mode === "signup" ? "Create my account" : "Sign in"} <ArrowRight size={17} />
            </Button>
            {mode === "signin" && (
              <p className="auth-small">
                Forgot your password? Message the NOVICE team and we&rsquo;ll reset it.
              </p>
            )}
            <p className="auth-small">
              Your Never-Done List is private. Others only see anonymous totals.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

export function NotConfigured() {
  return (
    <div className="auth">
      <header>
        <Logo />
      </header>
      <div className="page narrow">
        <h1>Almost there.</h1>
        <p className="lede">
          NOVICE isn&rsquo;t connected to its database yet. Add VITE_SUPABASE_URL and
          VITE_SUPABASE_ANON_KEY to your environment (see SETUP.md), then restart.
        </p>
      </div>
    </div>
  );
}
