"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardGilt, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup";

/** Where to go after signing in. Only same-site paths are allowed. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next") ?? "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signingUp = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (signingUp) await register(email, password, name);
      else await login(email, password);
      router.push(nextPath());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail
          : "Could not reach the game server. Please try again."
      );
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-7 inline-flex items-center gap-2 text-micro font-semibold uppercase tracking-[0.12em] text-ink-subtle transition-colors hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <CardGilt>
        <CardHeader className="items-center text-center">
          <Fingerprint className="mb-1 h-8 w-8 text-gold" strokeWidth={1.5} aria-hidden />
          <CardTitle className="text-gilt">
            {signingUp ? "Create Your Account" : "Welcome Back, Detective"}
          </CardTitle>
          <CardDescription>
            {signingUp
              ? "Keep your record and awards on your own account."
              : "Sign in to see your record and awards."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-3.5">
            {signingUp && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-micro font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                  Detective name <span className="font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <Input
                  id="name"
                  value={name}
                  maxLength={40}
                  autoComplete="nickname"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sherlock"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-micro font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-micro font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                minLength={signingUp ? 8 : 1}
                maxLength={128}
                value={password}
                autoComplete={signingUp ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={signingUp ? "At least 8 characters" : "Your password"}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-ui text-red-300">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {signingUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="mt-4 text-center text-ui text-ink-muted">
            {signingUp ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(signingUp ? "signin" : "signup")}
              className="font-semibold text-gold underline-offset-4 hover:underline"
            >
              {signingUp ? "Sign in" : "Create an account"}
            </button>
          </p>

          <div className="my-5 flex items-center gap-3 text-micro uppercase tracking-[0.14em] text-ink-subtle">
            <span className="h-px flex-1 bg-hairline" /> or <span className="h-px flex-1 bg-hairline" />
          </div>

          <Link href="/new" className="block">
            <Button variant="outline" size="lg" className="w-full">
              Play as Guest
            </Button>
          </Link>
          <p className="mt-2.5 text-center text-micro text-ink-subtle">
            No account needed. Guest games are not saved to an account.
          </p>
        </CardContent>
      </CardGilt>
    </main>
  );
}
