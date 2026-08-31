"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Users } from "lucide-react";
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
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mb-2 text-3xl font-bold">New Case</h1>
      <p className="mb-8 text-muted-foreground">
        The AI will write a brand-new mystery for you. Once the case starts, the
        answer is fixed — it never changes while you play.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> How many guests?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={cn(
                  "rounded-md border py-3 text-lg font-semibold transition-colors",
                  count === c
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border hover:bg-secondary"
                )}
              >
                {c}
                {c === 6 && (
                  <span className="block text-[9px] font-normal text-muted-foreground">
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
          <CardTitle>How hard should it be?</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={cn(
                "rounded-md border p-4 text-left transition-colors",
                difficulty === d.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              )}
            >
              <div className="font-semibold">{d.name}</div>
              <div className="text-xs text-muted-foreground">{d.blurb}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      {error && (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button size="lg" className="w-full" onClick={start} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Writing your mystery…
          </>
        ) : (
          "Make Case & Start"
        )}
      </Button>
    </main>
  );
}
