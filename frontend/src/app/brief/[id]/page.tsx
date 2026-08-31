"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, MapPin, Loader2, ArrowRight, Scale, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardGilt, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Snapshot } from "@/lib/types";

export default function CaseBriefPage() {
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
          Opening the case file
        </p>
      </div>
    );
  }

  const { brief } = snap;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Badge variant="gold">{brief.difficulty}</Badge>
          <Badge variant="outline">{brief.num_characters} guests</Badge>
          <Badge variant="outline">{brief.location_type}</Badge>
        </div>

        <h1 className="type-display-lg mb-4 text-gilt">{brief.title}</h1>
        <div className="mb-5 h-px w-full bg-gradient-to-r from-gold/55 via-gold/20 to-transparent" />

        <div className="mb-7 flex flex-wrap gap-5 text-ui text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gold/90" strokeWidth={2} aria-hidden />
            {brief.location_name}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold/90" strokeWidth={2} aria-hidden />
            <span className="type-num">{brief.start_time}</span>
          </span>
        </div>

        <CardGilt className="mb-7">
          <CardHeader>
            <CardTitle>The Case</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-prose text-[1.125rem] leading-[1.7] text-ink/95">
              {brief.introduction}
            </p>

            <div className="rounded-lg border border-hairline bg-gradient-to-b from-surface-3/50 to-surface-2/40 p-4 shadow-[inset_0_1px_0_0_hsl(210_40%_100%/0.05)]">
              <div className="mb-1.5 flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-ink-subtle">
                <Scale className="h-3 w-3" strokeWidth={2.4} aria-hidden />
                The Crime
              </div>
              <p className="text-body leading-relaxed text-ink">{brief.crime}</p>
            </div>

            <div className="rounded-lg border border-gold/35 bg-gradient-to-b from-gold/[0.1] to-gold/[0.03] p-4 shadow-[inset_0_1px_0_0_hsl(45_80%_80%/0.12)]">
              <div className="mb-1.5 flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-gold">
                <Target className="h-3 w-3" strokeWidth={2.4} aria-hidden />
                Your Job
              </div>
              <p className="text-body leading-relaxed text-ink">
                One of the {brief.num_characters} guests is not who they say they
                are. Look around, find clues, and work out who it is. You get only
                one guess, and you cannot take it back.
              </p>
            </div>
          </CardContent>
        </CardGilt>

        <Button
          size="xl"
          className="w-full"
          onClick={() => router.push(`/case/${id}`)}
        >
          Go In <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </main>
  );
}
