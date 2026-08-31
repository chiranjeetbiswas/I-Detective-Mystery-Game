"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Award, Skull, Loader2, RefreshCw, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { setActiveGame } from "@/lib/session";
import type { Snapshot } from "@/lib/types";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getGame(id).then(setSnap).catch(() => setSnap(null));
  }, [id]);

  async function restart() {
    setBusy(true);
    try {
      const s = await api.restart(id);
      setActiveGame(s.state.game_id);
      router.push(`/case/${s.state.game_id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!snap) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const won = snap.state.status === "won";
  const sol = snap.solution;
  const verdict = snap.transcript.filter((t) => t.speaker === "Verdict").pop();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="animate-fade-in w-full">
        <div className="mb-6 flex justify-center">
          <div
            className={
              won
                ? "rounded-full border border-primary/40 bg-primary/10 p-6"
                : "rounded-full border border-destructive/40 bg-destructive/10 p-6"
            }
          >
            {won ? (
              <Award className="h-14 w-14 text-primary" />
            ) : (
              <Skull className="h-14 w-14 text-destructive" />
            )}
          </div>
        </div>

        <h1 className="mb-2 text-4xl font-bold">
          {won ? "Case Solved" : "They Got Away"}
        </h1>
        <p className="mb-6 text-muted-foreground">
          {won
            ? "You worked it out, detective."
            : "You picked the wrong person. This one got away."}
        </p>

        {verdict && (
          <Card className="mb-4 text-left">
            <CardContent className="pt-5">
              <p className="italic leading-relaxed text-foreground/90">
                {verdict.text}
              </p>
            </CardContent>
          </Card>
        )}

        {sol && (
          <Card className="mb-6 text-left">
            <CardHeader>
              <CardTitle className="text-base">The Truth</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">The person hiding: </span>
                <span className="font-semibold text-primary">
                  {sol.target_name}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Who they really are: </span>
                {sol.true_identity}
              </p>
              <p className="text-muted-foreground">{sol.reasoning}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={restart} variant="outline" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Play this case again
          </Button>
          <Link href="/new">
            <Button>
              <Search className="h-4 w-4" /> New Case
            </Button>
          </Link>
          <Link href="/stats">
            <Button variant="ghost">My Record</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">
              <Home className="h-4 w-4" /> Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
