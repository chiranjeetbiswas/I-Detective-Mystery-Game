"use client";

import { motion } from "framer-motion";
import { Meter } from "@/components/ui/meter";
import { Avatar } from "@/components/game/avatar";
import { cn } from "@/lib/utils";
import { moodMeta, statusMeta } from "@/lib/mood";
import type { CharacterView } from "@/lib/types";

/**
 * SUSPECT DOSSIER
 *
 * Visually this is a case file rather than a list row. The hierarchy runs:
 *
 *   1. Portrait      — the face is the primary identifier, so it is largest.
 *   2. Name          — display serif, the only serif in the card.
 *   3. Role + age    — quiet sans, one step down.
 *   4. Mood chip     — icon + word + colour, the emotional read.
 *   5. Stat block    — engraved meters, the mechanical read.
 *
 * A gilt left edge and a raised surface mark the active suspect. Under high
 * stress the whole card gains an inset red vignette whose opacity scales with
 * the value, so pressure is legible at a glance across the whole roster.
 *
 * Behaviour is unchanged: this is still a single button that calls onSelect.
 */
export function CharacterCard({
  c,
  active,
  onSelect,
}: {
  c: CharacterView;
  active?: boolean;
  onSelect?: () => void;
}) {
  const mood = moodMeta(c.mood);
  const status = statusMeta(c.status);
  const isActive = active ?? c.is_active;
  const MoodIcon = mood.Icon;
  const StatusIcon = status.Icon;

  // pressure only becomes visible past 55 so the roster isn't washed in red
  const dread = Math.max(0, Math.min(1, (c.stress - 55) / 45));

  return (
    <motion.button
      onClick={onSelect}
      aria-pressed={isActive}
      aria-label={`${c.name}, ${c.occupation}, currently ${mood.label}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ y: 0, scale: 0.995 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg p-3 text-left",
        "transition-[box-shadow,border-color,background-color] duration-300 ease-cine",
        isActive
          ? "border border-gold/45 bg-gradient-to-b from-gold/[0.13] to-surface/60 shadow-gold"
          : "border border-hairline bg-gradient-to-b from-surface-2/60 to-surface/50 shadow-md hover:border-hairline-strong/80 hover:from-surface-2/85"
      )}
    >
      {/* gilt spine on the active file */}
      {isActive && (
        <motion.span
          layoutId="dossier-spine"
          className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-gold-bright via-gold to-gold-deep"
        />
      )}

      {/* pressure vignette — scales with stress */}
      {dread > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{ boxShadow: `inset 0 0 26px hsl(356 72% 42% / ${dread * 0.32})` }}
        />
      )}

      <div className="relative flex items-start gap-3">
        <Avatar
          seed={c.avatar_seed || c.id}
          gender={c.gender}
          age={c.age}
          occupation={c.occupation}
          mood={c.mood}
          stress={c.stress}
          size="md"
          active={isActive}
          ring={isActive ? "hsl(43 62% 62%)" : "hsl(217 18% 26%)"}
        />

        <div className="min-w-0 flex-1">
          {/* name + talking flag */}
          <div className="flex items-center gap-1.5">
            <span className="truncate font-display text-[0.9375rem] font-semibold leading-tight text-ink">
              {c.name}
            </span>
            {isActive && (
              <span className="shrink-0 rounded-full border border-gold/50 bg-gold/15 px-1.5 py-[1px] text-[0.625rem] font-bold uppercase tracking-[0.08em] text-gold-bright">
                Talking
              </span>
            )}
          </div>

          {/* role */}
          <div className="mt-0.5 truncate text-micro text-ink-subtle">
            {c.age} · {c.occupation}
          </div>

          {/* mood chip + availability */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-[2px] text-[0.625rem] font-semibold uppercase tracking-[0.07em]"
              style={{ color: mood.color, backgroundColor: mood.tint }}
            >
              <MoodIcon className="h-2.5 w-2.5" aria-hidden strokeWidth={2.4} />
              {mood.label}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[0.625rem] font-medium uppercase tracking-[0.07em]"
              style={{ color: status.color }}
            >
              <StatusIcon className="h-2.5 w-2.5" aria-hidden strokeWidth={2.2} />
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* gilt hairline separating identity from statistics */}
      <div className="rule-gold my-2.5 opacity-40" />

      {/* stat block */}
      <div className="relative space-y-1.5">
        <Meter label="Trust" value={c.trust} tone="trust" />
        <Meter label="Stress" value={c.stress} tone="stress" />
        {c.suspicion_of_player > 0 && (
          <Meter label="Wary of you" value={c.suspicion_of_player} tone="suspicion" />
        )}
      </div>

      {/* questioning history — quiet, but it is the detective's own record */}
      {c.times_questioned > 0 && (
        <div className="mt-2 text-[0.625rem] uppercase tracking-[0.08em] text-ink-subtle/80">
          Questioned {c.times_questioned}×
        </div>
      )}
    </motion.button>
  );
}
