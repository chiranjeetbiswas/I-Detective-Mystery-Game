"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Play, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { setActiveGame } from "@/lib/session";
import type { SaveSlot } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [provider, setProvider] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState("");

  useEffect(() => {
    Promise.all([api.listSaves(), api.health().catch(() => null)])
      .then(([s, h]) => {
        setSaves(s.saves);
        if (h) setProvider(h.provider);
      })
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
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mb-8 text-3xl font-bold">Settings & Saved Games</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" /> Backend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">API URL</span>
            <code className="text-xs">
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">LLM provider</span>
            {provider ? (
              <Badge variant={provider === "groq" ? "gold" : "outline"}>
                {provider}
              </Badge>
            ) : (
              <Badge variant="danger">offline</Badge>
            )}
          </div>
          <p className="pt-2 text-xs text-muted-foreground">
            Put <code>GROQ_API_KEY</code> in the backend <code>.env</code> file to
            use Groq. With no key, the built-in mock provider runs the whole game
            offline.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Games</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : saves.length ? (
            <div className="space-y-2">
              {saves.map((s) => (
                <div
                  key={s.slot}
                  className="flex items-center justify-between rounded-md border border-border bg-secondary/30 p-3"
                >
                  <div>
                    <div className="font-medium">{s.slot}</div>
                    <div className="text-xs text-muted-foreground">
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Play className="h-4 w-4" /> Resume
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No saved games yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
