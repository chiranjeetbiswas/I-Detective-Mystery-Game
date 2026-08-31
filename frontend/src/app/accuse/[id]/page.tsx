"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Gavel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/game/avatar";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Snapshot } from "@/lib/types";

export default function AccusePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [chosen, setChosen] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getGame(id).then(setSnap).catch(() => setSnap(null));
  }, [id]);

  async function accuse() {
    if (!chosen) return;
    setBusy(true);
    try {
      await api.accuse(id, chosen);
      router.replace(`/result/${id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!snap) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-7 w-7 animate-spin text-gold" />
        <p className="text-micro uppercase tracking-[0.2em] text-ink-subtle">
          Opening the case file
        </p>
      </div>
    );
  }

  const chosenChar = snap.characters.find((c) => c.id === chosen);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {/* This screen is the only place in the game that uses crimson as a
          primary colour — the irreversible action gets its own visual key. */}
      <div className="mb-3 flex items-center gap-3">
        <Gavel className="h-6 w-6 text-danger" strokeWidth={1.8} aria-hidden />
        <h1 className="type-display-lg text-[hsl(356_70%_74%)]">
          Your Final Guess
        </h1>
      </div>
      <div className="mb-7 h-px w-full bg-gradient-to-r from-danger/55 via-danger/20 to-transparent" />

      <div
        role="alert"
        className="mb-8 flex items-start gap-3 rounded-lg border border-danger/45 bg-gradient-to-b from-danger/[0.13] to-danger/[0.04] p-4 shadow-[inset_0_1px_0_0_hsl(356_80%_75%/0.12)]"
      >
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(356_80%_74%)]"
          strokeWidth={2.2}
          aria-hidden
        />
        <p className="text-body leading-relaxed text-ink">
          You get <strong className="text-[hsl(356_80%_78%)]">one</strong> guess.
          If you pick the wrong person, you lose the case and the real one gets
          away. Be sure.
        </p>
      </div>

      <div className="mb-8 grid gap-2.5 sm:grid-cols-2">
        {snap.characters.map((c) => {
          const picked = chosen === c.id;
          return (
            <motion.button
              key={c.id}
              onClick={() => setChosen(c.id)}
              aria-pressed={picked}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.995 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3.5 text-left transition-colors duration-250",
                picked
                  ? "border-danger/60 bg-gradient-to-b from-danger/[0.15] to-surface/50 shadow-[0_0_0_1px_hsl(356_64%_50%/0.35),0_8px_26px_-10px_hsl(356_70%_30%/0.7)]"
                  : "border-hairline bg-gradient-to-b from-surface-2/55 to-surface/45 shadow-md hover:border-hairline-strong/80"
              )}
            >
              <Avatar
                seed={c.avatar_seed || c.id}
                gender={c.gender}
                age={c.age}
                occupation={c.occupation}
                mood={c.mood}
                stress={c.stress}
                name={c.name}
                size="md"
                ring={picked ? "hsl(356 64% 58%)" : "hsl(217 18% 26%)"}
              />
              <div className="min-w-0">
                <div
                  className={cn(
                    "truncate font-display text-[0.9375rem] font-semibold",
                    picked ? "text-[hsl(356_80%_80%)]" : "text-ink"
                  )}
                >
                  {c.name}
                </div>
                <div className="truncate text-micro text-ink-subtle">
                  {c.age} · {c.occupation}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="flex-1"
          size="lg"
          onClick={() => router.push(`/case/${id}`)}
        >
          Keep Looking
        </Button>
        {!confirming ? (
          <Button
            variant="destructive"
            className="flex-1"
            size="lg"
            disabled={!chosen}
            onClick={() => setConfirming(true)}
          >
            Name {chosenChar?.name ?? "…"}
          </Button>
        ) : (
          <Button
            variant="destructive"
            className="flex-1 animate-pulse-gold"
            size="lg"
            disabled={busy}
            onClick={accuse}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Yes — this is my final answer"
            )}
          </Button>
        )}
      </div>
    </main>
  );
}
