"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Users, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { setActiveGame } from "@/lib/session";
import type { Difficulty } from "@/lib/types";

const COUNTS = [4, 5, 6, 8, 10, 12];
const DIFFICULTIES: { id: Difficulty; name: string; blurb: string }[] = [
  { id: "beginner", name: "Beginner", blurb: "More clues · guests tell the truth · hints on" },
  { id: "normal", name: "Normal", blurb: "A fair mix — good for most players" },
  { id: "expert", name: "Expert", blurb: "Guests are careful · more lies · fake clues" },
  { id: "master", name: "Master Detective", blurb: "No hints · many fake clues" },
];

/** Shared selected/unselected treatment for the option tiles. */
const tile = (selected: boolean) =>
  cn(
    "relative rounded-lg border p-4 text-left transition-all duration-250 ease-cine",
    selected
      ? "border-gold/50 bg-gradient-to-b from-gold/[0.13] to-surface/50 shadow-gold"
      : "border-hairline bg-gradient-to-b from-surface-2/55 to-surface/45 shadow-sm hover:-translate-y-[1px] hover:border-hairline-strong/80 hover:from-surface-2/80"
  );

export default function NewGamePage() {
  const router = useRouter();
  const [count, setCount] = useState(6);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setLoading(true);
    setError("");
    try {
      const snap = await api.newGame(count, difficulty);
      setActiveGame(snap.state.game_id);
      router.push(`/case/${snap.state.game_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make the case");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="mb-7 inline-flex items-center gap-2 text-micro font-semibold uppercase tracking-[0.12em] text-ink-subtle transition-colors hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <h1 className="type-display-lg mb-3 text-gilt">New Case</h1>
      <div className="mb-5 h-px w-28 bg-gradient-to-r from-gold/60 to-transparent" />
      <p className="mb-9 max-w-2xl font-prose text-[1.0625rem] italic leading-relaxed text-ink-muted">
        The AI will write a brand-new mystery for you. Once the case starts, the
        answer is fixed — it never changes while you play.
      </p>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-gold" strokeWidth={2} aria-hidden />
            How many guests?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                aria-pressed={count === c}
                className={cn(
                  "rounded-md border py-3 text-center transition-all duration-250 ease-cine",
                  count === c
                    ? "border-gold/50 bg-gradient-to-b from-gold/[0.15] to-surface/50 shadow-gold"
                    : "border-hairline bg-surface-2/50 hover:-translate-y-[1px] hover:border-hairline-strong/80 hover:bg-surface-3/60"
                )}
              >
                <span
                  className={cn(
                    "type-num block text-[1.25rem] font-bold leading-none",
                    count === c ? "text-gold-bright" : "text-ink"
                  )}
                >
                  {c}
                </span>
                {c === 6 && (
                  <span className="mt-1 block text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                    recommended
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-4 w-4 text-gold" strokeWidth={2} aria-hidden />
            How hard should it be?
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2.5 sm:grid-cols-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              aria-pressed={difficulty === d.id}
              className={tile(difficulty === d.id)}
            >
              <div
                className={cn(
                  "font-display text-[0.9375rem] font-semibold tracking-[0.02em]",
                  difficulty === d.id ? "text-gold-bright" : "text-ink"
                )}
              >
                {d.name}
              </div>
              <div className="mt-1 text-ui leading-relaxed text-ink-muted">
                {d.blurb}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-md border border-danger/45 bg-danger/10 p-3 text-ui text-[hsl(356_80%_80%)]"
          role="alert"
        >
          {error}
        </motion.p>
      )}

      <Button size="xl" className="w-full" onClick={start} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Writing your mystery…
          </>
        ) : (
          "Make Case & Start"
        )}
      </Button>
    </main>
  );
}
