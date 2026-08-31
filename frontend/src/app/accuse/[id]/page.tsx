"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-2 flex items-center gap-2 text-destructive">
        <Gavel className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Your Final Guess</h1>
      </div>
      <div className="mb-8 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          You get <strong>one</strong> guess. If you pick the wrong person, you
          lose the case and the real one gets away. Be sure.
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {snap.characters.map((c) => (
          <button
            key={c.id}
            onClick={() => setChosen(c.id)}
            className={cn(
              "flex items-center gap-3 rounded-md border p-4 text-left transition-colors",
              chosen === c.id
                ? "border-destructive bg-destructive/10"
                : "border-border hover:bg-secondary"
            )}
          >
            <Avatar seed={c.avatar_seed || c.id} gender={c.gender} size="sm" />
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                {c.age} · {c.occupation}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push(`/case/${id}`)}
        >
          Keep Looking
        </Button>
        {!confirming ? (
          <Button
            variant="destructive"
            className="flex-1"
            disabled={!chosen}
            onClick={() => setConfirming(true)}
          >
            Name {snap.characters.find((c) => c.id === chosen)?.name ?? "…"}
          </Button>
        ) : (
          <Button
            variant="destructive"
            className="flex-1"
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
