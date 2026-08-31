"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, MapPin, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { brief } = snap;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="gold">{brief.difficulty.toUpperCase()}</Badge>
        <Badge variant="outline">{brief.num_characters} guests</Badge>
        <Badge variant="outline">{brief.location_type}</Badge>
      </div>
      <h1 className="mb-3 font-serif text-4xl font-bold">{brief.title}</h1>

      <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" /> {brief.location_name}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" /> {brief.start_time}
        </span>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>The Case</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-[15px] leading-relaxed">
          <p className="text-foreground/90">{brief.introduction}</p>
          <div className="rounded-md border border-border bg-secondary/40 p-4">
            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
              The Crime
            </div>
            <p>{brief.crime}</p>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <div className="mb-1 text-xs uppercase tracking-wide text-primary">
              Your Job
            </div>
            <p>
              One of the {brief.num_characters} guests is not who they say they
              are. Look around, find clues, and work out who it is. You get only
              one guess, and you cannot take it back.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full"
        onClick={() => router.push(`/case/${id}`)}
      >
        Go In <ArrowRight className="h-5 w-5" />
      </Button>
    </main>
  );
}
