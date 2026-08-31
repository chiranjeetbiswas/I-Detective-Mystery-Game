"use client";

import Link from "next/link";
import { Fingerprint, Search, BookOpen, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="animate-fade-in">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full border border-primary/30 bg-primary/10 p-5 animate-pulse-gold">
            <Fingerprint className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="mb-3 text-5xl font-bold tracking-tight sm:text-6xl">
          Identity <span className="text-primary">Hunt</span>
        </h1>
        <p className="mx-auto mb-2 max-w-2xl text-lg text-muted-foreground">
          An AI detective game. Every case is new, and every guest is hiding
          something.
        </p>
        <p className="mx-auto mb-10 max-w-xl text-sm text-muted-foreground/80">
          Look around the place. Ask the guests questions. Check if their stories
          match. You get <span className="text-primary font-semibold">one</span>{" "}
          guess to name the person who is hiding.
        </p>

        <div className="mb-14 flex flex-wrap items-center justify-center gap-4">
          <Link href="/new">
            <Button size="lg" className="text-base">
              <Search className="h-5 w-5" /> Start a New Case
            </Button>
          </Link>
          <Link href="/stats">
            <Button size="lg" variant="outline">
              <BarChart3 className="h-5 w-5" /> My Record
            </Button>
          </Link>
          <Link href="/settings">
            <Button size="lg" variant="ghost">
              Settings
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Search,
              title: "Play Your Own Way",
              body: "Just type what you want to do. Search a room, ask a guest, show a clue. No menus to learn.",
            },
            {
              icon: BookOpen,
              title: "Notes Made For You",
              body: "Clues, lies, times and secrets are written down for you while you play.",
            },
            {
              icon: Fingerprint,
              title: "One Guess Only",
              body: "The answer never changes. Work it out, then name the person who is hiding.",
            },
          ].map((f) => (
            <Card key={f.title} className="text-left">
              <CardContent className="pt-5">
                <f.icon className="mb-3 h-6 w-6 text-primary" />
                <h3 className="mb-1 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
