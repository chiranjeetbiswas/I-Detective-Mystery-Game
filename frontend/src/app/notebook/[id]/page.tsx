"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => router.push(`/case/${id}`)}
      >
        <ArrowLeft className="h-4 w-4" /> Back to the case
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Your Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotebookPanel notebook={snap.notebook} />
        </CardContent>
      </Card>
    </main>
  );
}
