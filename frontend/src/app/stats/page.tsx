"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Award, Loader2, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Statistics } from "@/lib/types";

function Stat({
  label,
  value,
  i,
}: {
  label: string;
  value: string | number;
  i: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="h-full">
        <CardContent className="pt-5 text-center">
          <div className="type-num truncate text-[1.75rem] font-bold leading-none text-gilt">
            {value}
          </div>
          <div className="mt-2 text-[0.5625rem] font-bold uppercase tracking-[0.14em] text-ink-subtle">
            {label}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Statistics | null>(null);

  useEffect(() => {
    api.stats().then(setStats).catch(() => setStats(null));
  }, []);

  if (!stats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-7 w-7 animate-spin text-gold" />
        <p className="text-micro uppercase tracking-[0.2em] text-ink-subtle">
          Pulling your record
        </p>
      </div>
    );
  }

  const tiles: { label: string; value: string | number }[] = [
    { label: "Solved", value: stats.cases_solved },
    { label: "Lost", value: stats.cases_failed },
    { label: "Games", value: stats.total_games },
    { label: "Right %", value: `${Math.round(stats.accuracy)}%` },
    {
      // Rounded to whole minutes: the raw average carries a decimal that
      // overflows the tile and clips the unit.
      label: "Usual Time",
      value: stats.average_solve_minutes
        ? `${Math.round(stats.average_solve_minutes)}m`
        : "—",
    },
    {
      label: "Best Time",
      value:
        stats.fastest_solve_minutes != null
          ? `${Math.round(stats.fastest_solve_minutes)}m`
          : "—",
    },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/"
        className="mb-7 inline-flex items-center gap-2 text-micro font-semibold uppercase tracking-[0.12em] text-ink-subtle transition-colors hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="type-display-lg text-gilt">Your Record</h1>
        <Badge variant="gold">
          <Trophy className="h-3 w-3" strokeWidth={2.4} aria-hidden /> {stats.rank}
        </Badge>
      </div>
      <div className="mb-8 h-px w-full bg-gradient-to-r from-gold/55 via-gold/20 to-transparent" />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t, i) => (
          <Stat key={t.label} label={t.label} value={t.value} i={i} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <Award className="h-4 w-4 text-gold" strokeWidth={2} aria-hidden />
            Awards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.achievements.length ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {stats.achievements.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="rounded-lg border border-gold/35 bg-gradient-to-b from-gold/[0.1] to-gold/[0.03] p-3.5 shadow-[inset_0_1px_0_0_hsl(45_80%_80%/0.12)]"
                >
                  <div className="font-display text-[0.9375rem] font-semibold text-gold-bright">
                    {a.name}
                  </div>
                  <div className="mt-1 text-ui leading-relaxed text-ink-muted">
                    {a.description}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-ui italic text-ink-subtle">
              No awards yet. Solve your first case to get one.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
