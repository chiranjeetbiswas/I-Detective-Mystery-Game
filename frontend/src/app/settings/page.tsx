"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { setActiveGame } from "@/lib/session";
import type { SaveSlot } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState("");

  useEffect(() => {
    api
      .listSaves()
      .then((s) => setSaves(s.saves))
      .finally(() => setLoading(false));
  }, []);

  async function resume(slot: string) {
    setResuming(slot);
    try {
      const snap = await api.resume(slot);
      setActiveGame(snap.state.game_id);
      router.push(
        snap.state.status === "in_progress"
          ? `/case/${snap.state.game_id}`
          : `/result/${snap.state.game_id}`
      );
    } finally {
      setResuming("");
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

      <h1 className="type-display-lg mb-3 text-gilt">Settings &amp; Saved Games</h1>
      <div className="mb-8 h-px w-full bg-gradient-to-r from-gold/55 via-gold/20 to-transparent" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <Save className="h-4 w-4 text-gold" strokeWidth={2} aria-hidden />
            Saved Games
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          ) : saves.length ? (
            <div className="space-y-2">
              {saves.map((s, i) => (
                <motion.div
                  key={s.slot}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: i * 0.04 }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-gradient-to-b from-surface-2/55 to-surface/45 p-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-display text-[0.9375rem] font-semibold text-ink">
                      {s.slot}
                    </div>
                    <div className="truncate text-micro text-ink-subtle">
                      {s.title} · {s.status}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resume(s.slot)}
                    disabled={resuming === s.slot}
                  >
                    {resuming === s.slot ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" /> Resume
                      </>
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-ui italic text-ink-subtle">No saved games yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
