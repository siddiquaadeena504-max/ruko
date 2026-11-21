"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/client/api";
import { Logo } from "@/components/Logo";
import { Button, Card, Notice, cx } from "@/components/ui";

export function AuthView({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("form");
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/signup", { body: mode === "login" ? { email, password } : { name, email, password } });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function demo() {
    setBusy("demo");
    setError(null);
    try {
      await api("/api/auth/demo", { method: "POST" });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the demo");
      setBusy(null);
    }
  }

  return (
    <main id="main" className="grain min-h-dvh px-5 py-8">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div>
          <Logo size={44} />
          <p className="eyebrow mt-8">Family dashboard</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight">Be there, even when you can’t be there.</h1>
          <p className="mt-4 max-w-md text-lg text-navy-soft">
            See Ruko alerts for your parents and grandparents, acknowledge them so Ruko stops escalating, and manage who gets told.
          </p>
          <ul className="mt-6 space-y-2 text-base text-navy-soft">
            <li>• Alerts arrive only with their consent</li>
            <li>• Escalates to the next contact if nobody responds</li>
            <li>• No call recordings, no transcripts — just outcomes</li>
          </ul>
        </div>

        <Card className="p-6 sm:p-8">
          <div className="grid grid-cols-2 rounded-2xl bg-navy/5 p-1" role="tablist">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cx("min-h-[44px] rounded-xl font-semibold transition", mode === m ? "bg-white shadow-card" : "text-navy-soft")}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="label" htmlFor="f-name">Your name</label>
                <input id="f-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </div>
            )}
            <div>
              <label className="label" htmlFor="f-email">Email</label>
              <input id="f-email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div>
              <label className="label" htmlFor="f-pw">Password</label>
              <input
                id="f-pw"
                type="password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "signup" ? 8 : undefined}
                required
              />
              {mode === "signup" && <p className="mt-1 text-sm text-navy-soft">At least 8 characters.</p>}
            </div>
            {error && <Notice tone="warn">{error}</Notice>}
            <Button type="submit" className="w-full" loading={busy === "form"}>
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-sm text-navy-faint">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" className="w-full" icon={<Sparkles className="h-5 w-5" />} loading={busy === "demo"} onClick={demo}>
            Explore with sample data
          </Button>
          <p className="mt-3 text-center text-sm text-navy-soft">Creates a temporary demo account. Sample numbers are fictional; nothing is sent.</p>
        </Card>
      </div>
      <p className="mt-10 text-center">
        <Link href="/" className="font-semibold text-lavender-deep">
          ← Back to the Ruko app
        </Link>
      </p>
    </main>
  );
}
