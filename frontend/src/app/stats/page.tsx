"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Loader2, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Statistics } from "@/lib/types";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-5 text-center">
        <div className="text-3xl font-bold text-primary">{value}</div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Statistics | null>(null);

  useEffect(() => {
    api.stats().then(setStats).catch(() => setStats(null));
  }, []);

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Record</h1>
        <Badge variant="gold" className="text-sm">
          <Trophy className="mr-1 h-4 w-4" /> {stats.rank}
        </Badge>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Solved" value={stats.cases_solved} />
        <Stat label="Lost" value={stats.cases_failed} />
        <Stat label="Games" value={stats.total_games} />
        <Stat label="Right %" value={`${stats.accuracy}%`} />
        <Stat
          label="Usual Time"
          value={stats.average_solve_minutes ? `${stats.average_solve_minutes}m` : "—"}
        />
        <Stat
          label="Best Time"
          value={stats.fastest_solve_minutes != null ? `${stats.fastest_solve_minutes}m` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" /> Awards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.achievements.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {stats.achievements.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md border border-primary/30 bg-primary/5 p-3"
                >
                  <div className="font-semibold text-primary">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.description}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No awards yet. Solve your first case to get one.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
