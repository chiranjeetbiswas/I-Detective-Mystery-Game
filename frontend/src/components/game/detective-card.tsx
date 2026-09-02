"use client";

import { motion } from "framer-motion";
import { Brain, Scale } from "lucide-react";
import { Avatar } from "@/components/game/avatar";
import { cn } from "@/lib/utils";
import { detectiveStatusMeta } from "@/lib/mood";
import type { DetectiveView } from "@/lib/types";

/**
 * DETECTIVE TEAMMATE CARD
 *
 * Mirrors the suspect dossier styling but reads as an ally, not a subject:
 * a cool teal spine instead of the gilt suspect spine, a specialty badge, a
 * live status line, the current assignment, and — while the detective is out
 * working — an investigation progress bar.
 *
 * Two visual identities: Ava (psychology) leans violet; Ryan (logic) leans
 * teal, so the pair reads as two distinct minds at a glance.
 */

const SPECIALTY = {
  psychology: {
    label: "Psychology",
    Icon: Brain,
    accent: "hsl(268 58% 74%)",
    tint: "hsl(268 58% 64% / 0.14)",
    ring: "hsl(268 58% 66%)",
  },
  logic: {
    label: "Logic",
    Icon: Scale,
    accent: "hsl(190 60% 62%)",
    tint: "hsl(190 60% 52% / 0.14)",
    ring: "hsl(190 60% 56%)",
  },
} as const;

export function DetectiveCard({
  d,
  active,
  onSelect,
}: {
  d: DetectiveView;
  active?: boolean;
  onSelect?: () => void;
}) {
  const spec = SPECIALTY[d.specialty] ?? SPECIALTY.logic;
  const SpecIcon = spec.Icon;
  const status = detectiveStatusMeta(d.status);
  const StatusIcon = status.Icon;
  const busy =
    d.status === "investigating" ||
    d.status === "writing_report" ||
    d.status === "returning";
  const thinking = d.status === "analyzing" || busy;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ y: 0, scale: 0.995 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`${d.name}, ${spec.label} detective, ${status.label}`}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg p-3 text-left",
        "transition-[box-shadow,border-color,background-color] duration-300 ease-cine",
        active
          ? "border border-gold/45 bg-gradient-to-b from-gold/[0.13] to-surface/60 shadow-gold"
          : "border border-hairline bg-gradient-to-b from-surface-2/60 to-surface/50 shadow-md hover:border-hairline-strong/80 hover:from-surface-2/85"
      )}
    >
      {/* specialty spine marks this as a teammate; gold when active */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: active ? "hsl(43 62% 62%)" : spec.accent }}
      />

      <div className="relative flex items-start gap-3">
        <Avatar
          seed={d.avatar_seed || d.detective_id}
          gender={d.gender}
          mood={thinking ? "thinking" : "confident"}
          size="md"
          active={active}
          ring={active ? "hsl(43 62% 62%)" : spec.ring}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-display text-[0.9375rem] font-semibold leading-tight text-ink">
              {d.name}
            </span>
            {active && (
              <span className="shrink-0 rounded-full border border-gold/50 bg-gold/15 px-1.5 py-[1px] text-[0.625rem] font-bold uppercase tracking-[0.08em] text-gold-bright">
                Talking
              </span>
            )}
          </div>

          {/* specialty badge */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-[2px] text-[0.625rem] font-semibold uppercase tracking-[0.07em]"
              style={{ color: spec.accent, backgroundColor: spec.tint }}
            >
              <SpecIcon className="h-2.5 w-2.5" aria-hidden strokeWidth={2.4} />
              {spec.label}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[0.625rem] font-medium uppercase tracking-[0.07em]"
              style={{ color: status.color }}
            >
              <StatusIcon className="h-2.5 w-2.5" aria-hidden strokeWidth={2.2} />
              {status.label}
            </span>
          </div>

          {/* tagline / assignment */}
          <div className="mt-1 truncate text-micro text-ink-subtle">
            {d.assignment || d.tagline}
          </div>
        </div>
      </div>

      {/* investigation progress — only while out working */}
      {busy && (
        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between text-[0.5625rem] font-bold uppercase tracking-[0.1em] text-ink-subtle">
            <span>Investigation</span>
            <span className="type-num">{d.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3/70">
            <motion.div
              className="h-full rounded-full"
              style={{ background: spec.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${d.progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* quiet footer stats */}
      {(d.interviews_done > 0 || d.confidence > 0) && !busy && (
        <div className="mt-2 flex gap-3 text-[0.625rem] uppercase tracking-[0.08em] text-ink-subtle/80">
          {d.interviews_done > 0 && <span>{d.interviews_done} interviews</span>}
          {d.confidence > 0 && <span>{d.confidence}% sure</span>}
        </div>
      )}
    </motion.button>
  );
}
