"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  FileQuestion,
  KeyRound,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Notebook } from "@/lib/types";

/**
 * THE NOTEBOOK
 *
 * Deliberately the only warm surface in the interface. Everything else is cool
 * navy; the notebook is aged paper. That material contrast is what makes it
 * feel like an object the detective carries rather than another panel of the
 * same dashboard.
 *
 * Each section gets its own icon and accent so the six categories are
 * distinguishable at a glance, and contradictions are tinted red because they
 * are the entries that actually break a case open.
 */

function Section({
  title,
  entries,
  Icon,
  accent = "hsl(43 66% 66%)",
  danger = false,
}: {
  title: string;
  entries: { title: string; detail?: string; at_time?: string }[];
  Icon: LucideIcon;
  accent?: string;
  danger?: boolean;
}) {
  if (!entries.length) return null;
  return (
    <section className="mb-5">
      <h4
        className="mb-2 flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.13em]"
        style={{ color: accent }}
      >
        <Icon className="h-3 w-3" aria-hidden strokeWidth={2.4} />
        {title}
        <span className="ml-auto type-num text-[0.625rem] font-medium text-ink-subtle/70">
          {entries.length}
        </span>
      </h4>
      <ul className="space-y-1.5">
        {entries.map((e, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.24) }}
            className={
              danger
                ? "rounded-md border border-danger/30 bg-danger/[0.07] p-2.5 shadow-sm"
                : "surface-paper rounded-md p-2.5"
            }
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-[0.8125rem] font-semibold leading-snug text-ink">
                {e.title}
              </span>
              {e.at_time && (
                <span className="type-num shrink-0 text-[0.625rem] text-ink-subtle/80">
                  {e.at_time}
                </span>
              )}
            </div>
            {e.detail && (
              <p className="mt-1 text-ui leading-relaxed text-ink-muted">{e.detail}</p>
            )}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

export function NotebookPanel({ notebook }: { notebook: Notebook }) {
  const empty =
    !notebook.characters.length &&
    !notebook.evidence.length &&
    !notebook.secrets.length &&
    !notebook.contradictions.length;

  return (
    <div>
      {empty && (
        <p className="text-ui italic leading-relaxed text-ink-subtle">
          Your notes fill up by themselves while you play.
        </p>
      )}
      <Section title="Guests" entries={notebook.characters} Icon={Users} />
      <Section
        title="Clues"
        entries={notebook.evidence}
        Icon={Search}
        accent="hsl(199 62% 72%)"
      />
      <Section
        title="Things That Do Not Match"
        entries={notebook.contradictions}
        Icon={AlertTriangle}
        accent="hsl(356 76% 72%)"
        danger
      />
      <Section
        title="Secrets You Learned"
        entries={notebook.secrets}
        Icon={KeyRound}
        accent="hsl(268 58% 78%)"
      />
      <Section
        title="What Happened, and When"
        entries={notebook.timeline}
        Icon={Clock}
        accent="hsl(152 48% 68%)"
      />
      <Section
        title="Still To Find Out"
        entries={notebook.open_questions}
        Icon={FileQuestion}
        accent="hsl(36 82% 70%)"
      />
    </div>
  );
}
