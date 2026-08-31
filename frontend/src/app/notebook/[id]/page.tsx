"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { CardGilt, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotebookPanel } from "@/components/game/notebook-panel";
import { api } from "@/lib/api";
import type { Snapshot } from "@/lib/types";

export default function NotebookPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    api.getGame(id).then(setSnap).catch(() => setSnap(null));
  }, [id]);

  if (!snap) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-7 w-7 animate-spin text-gold" />
        <p className="text-micro uppercase tracking-[0.2em] text-ink-subtle">
          Finding your notebook
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Button
        variant="ghost"
        size="sm"
        className="mb-5"
        onClick={() => router.push(`/case/${id}`)}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the case
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <CardGilt>
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <BookOpen className="h-4 w-4 text-gold" strokeWidth={2} aria-hidden />
              Your Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NotebookPanel notebook={snap.notebook} />
          </CardContent>
        </CardGilt>
      </motion.div>
    </main>
  );
}
