"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Award, Skull, Loader2, RefreshCw, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardGilt, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-7 w-7 animate-spin text-gold" />
        <p className="text-micro uppercase tracking-[0.2em] text-ink-subtle">
          Closing the file
        </p>
      </div>
    );
  }

  const won = snap.state.status === "won";
  const sol = snap.solution;
  const verdict = snap.transcript.filter((t) => t.speaker === "Verdict").pop();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
      <motion.div
        className="w-full"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* seal — gilt for a solve, cold crimson for a miss */}
        <div className="mb-7 flex justify-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={
              won
                ? "rounded-full border border-gold/40 bg-gradient-to-b from-gold/[0.16] to-transparent p-6 shadow-[0_0_50px_-12px_hsl(43_60%_50%/0.5),inset_0_1px_0_0_hsl(45_80%_80%/0.18)]"
                : "rounded-full border border-danger/40 bg-gradient-to-b from-danger/[0.14] to-transparent p-6 shadow-[0_0_50px_-12px_hsl(356_64%_45%/0.5),inset_0_1px_0_0_hsl(356_80%_75%/0.14)]"
            }
          >
            {won ? (
              <Award className="h-12 w-12 text-gold" strokeWidth={1.5} aria-hidden />
            ) : (
              <Skull
                className="h-12 w-12 text-[hsl(356_72%_70%)]"
                strokeWidth={1.5}
                aria-hidden
              />
            )}
          </motion.div>
        </div>

        <h1 className="type-display-lg mb-3">
          <span className={won ? "text-gilt" : "text-[hsl(356_72%_74%)]"}>
            {won ? "Case Solved" : "They Got Away"}
          </span>
        </h1>
        <div
          className={`mx-auto mb-5 h-px w-44 bg-gradient-to-r from-transparent ${
            won ? "via-gold/60" : "via-danger/55"
          } to-transparent`}
        />
        <p className="mb-8 font-prose text-[1.125rem] italic text-ink-muted">
          {won
            ? "You worked it out, detective."
            : "You picked the wrong person. This one got away."}
        </p>

        {verdict && (
          <Card className="mb-4 text-left">
            <CardContent className="pt-5">
              <p className="font-prose text-[1.125rem] leading-[1.7] text-ink/95">
                {verdict.text}
              </p>
            </CardContent>
          </Card>
        )}

        {sol && (
          <CardGilt className="mb-7 text-left">
            <CardHeader>
              <CardTitle>The Truth</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-ink-subtle">
                  The person hiding
                </div>
                <div className="font-display text-[1.0625rem] font-bold text-gilt">
                  {sol.target_name}
                </div>
              </div>
              <div>
                <div className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-ink-subtle">
                  Who they really are
                </div>
                <div className="text-body text-ink">{sol.true_identity}</div>
              </div>
              <div className="rule-gold opacity-30" />
              <p className="text-body leading-relaxed text-ink-muted">
                {sol.reasoning}
              </p>
            </CardContent>
          </CardGilt>
        )}

        <div className="flex flex-wrap justify-center gap-2.5">
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
      </motion.div>
    </main>
  );
}
