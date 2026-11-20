"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "better-auth/react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  SunMoon,
} from "lucide-react";
const client = createAuthClient();
export function AuthForm({ setup = false }: { setup?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (setup) {
        const r = await fetch("/api/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
      }
      const r = await client.signIn.email({
        email: String(values.email),
        password: String(values.password),
      });
      if (r.error) throw new Error(r.error.message || "Unable to sign in.");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Link className="logo" href="/login">
          <span className="logo-icon">e</span>earn
          <span className="accent">.</span>
        </Link>
        <div>
          <span className="eyebrow">A CLEARER PICTURE, EVERY DAY</span>
          <h1>
            Good work.
            <br />
            Clear numbers.
            <br />
            <span>Better decisions.</span>
          </h1>
          <p>
            Your production, people, and cash flow.
            <br />
            Together in one simple workspace.
          </p>
          <div className="auth-proof">
            <ShieldCheck size={18} /> Your business data stays private.
          </div>
        </div>
        <span className="muted small">
          Built for the way your business works.
        </span>
      </aside>
      <main className="auth-main">
        <button
          className="icon-btn theme-toggle"
          aria-label="Toggle light and dark theme"
          onClick={() => {
            const t =
              document.documentElement.dataset.theme === "dark"
                ? "light"
                : "dark";
            document.documentElement.dataset.theme = t;
            localStorage.setItem("earn-theme", t);
          }}
        >
          <SunMoon size={20} />
        </button>
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-badge">
            <LockKeyhole size={24} />
          </div>
          <h2>{setup ? "Set up your workspace" : "Welcome back"}</h2>
          <p className="muted">
            {setup
              ? "Create your administrator account to get started."
              : "Sign in to see how your business is doing."}
          </p>
          {setup && (
            <>
              <label>
                Setup key
                <input
                  name="key"
                  type="password"
                  required
                  autoComplete="off"
                  placeholder="Enter your private setup key"
                />
              </label>
              <p className="field-help">
                Your setup key is in the private .admin-setup.txt file. Setup
                closes after the first administrator is created.
              </p>
              <label>
                Workspace name
                <input
                  name="workspace"
                  required
                  placeholder="Your business name"
                  maxLength={80}
                />
              </label>
              <label>
                Your name
                <input
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="Full name"
                />
              </label>
              <label>
                Opening date
                <input
                  name="openingDate"
                  type="date"
                  defaultValue="2026-01-01"
                  required
                />
              </label>
            </>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="you@company.com"
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                name="password"
                type={visible ? "text" : "password"}
                minLength={setup ? 12 : 1}
                maxLength={128}
                autoComplete={setup ? "new-password" : "current-password"}
                required
                placeholder={
                  setup ? "At least 12 characters" : "Enter your password"
                }
              />
              <button
                type="button"
                className="icon-btn"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <button className="btn primary auth-submit" disabled={pending}>
            {pending ? "Please wait…" : setup ? "Create workspace" : "Sign in"}
            <ArrowRight size={17} />
          </button>
          <p className="small muted">
            {setup
              ? "BDT · Daily-rate salaries · Asia/Dhaka reporting dates"
              : "Need an account or a password reset? Contact your workspace administrator."}
          </p>
        </form>
      </main>
    </div>
  );
}
