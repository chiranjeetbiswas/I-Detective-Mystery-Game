"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Fingerprint, Search, BookOpen, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
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
];

/** Staggered reveal — the title card assembles itself rather than appearing. */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div variants={container} initial="hidden" animate="show">
        {/* seal */}
        <motion.div variants={item} className="mb-7 flex justify-center">
          <div className="relative rounded-full border border-gold/30 bg-gradient-to-b from-gold/[0.14] to-transparent p-5 shadow-[0_0_40px_-10px_hsl(43_60%_45%/0.4),inset_0_1px_0_0_hsl(45_80%_80%/0.15)]">
            <span className="absolute inset-0 animate-pulse-gold rounded-full" aria-hidden />
            <Fingerprint className="h-11 w-11 text-gold" strokeWidth={1.5} />
          </div>
        </motion.div>

        <motion.h1 variants={item} className="type-display-xl mb-4">
          <span className="text-gilt">Identity Hunt</span>
        </motion.h1>

        <motion.div variants={item} className="mx-auto mb-6 h-px w-40 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        <motion.p variants={item} className="mx-auto mb-3 max-w-2xl font-prose text-[1.1875rem] italic leading-relaxed text-ink-muted">
          An AI detective game. Every case is new, and every guest is hiding
          something.
        </motion.p>

        <motion.p variants={item} className="mx-auto mb-11 max-w-xl text-body leading-relaxed text-ink-subtle">
          Look around the place. Ask the guests questions. Check if their stories
          match. You get{" "}
          <span className="font-semibold text-gold">one</span> guess to name the
          person who is hiding.
        </motion.p>

        <motion.div
          variants={item}
          className="mb-16 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/new">
            <Button size="lg">
              <Search className="h-4 w-4" /> Start a New Case
            </Button>
          </Link>
          <Link href="/stats">
            <Button size="lg" variant="outline">
              <BarChart3 className="h-4 w-4" /> My Record
            </Button>
          </Link>
          <Link href="/settings">
            <Button size="lg" variant="ghost">
              Settings
            </Button>
          </Link>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.div key={f.title} variants={item} whileHover={{ y: -3 }}>
              <Card className="h-full text-left transition-[border-color,box-shadow] duration-300 ease-cine hover:border-gold/35 hover:shadow-xl">
                <CardContent className="pt-5">
                  <f.icon
                    className="mb-3 h-5 w-5 text-gold"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  <h3 className="mb-1.5 font-display text-[0.9375rem] font-semibold tracking-[0.02em] text-ink">
                    {f.title}
                  </h3>
                  <p className="text-ui leading-relaxed text-ink-muted">{f.body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </main>
  );
}
