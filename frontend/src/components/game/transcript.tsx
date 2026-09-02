"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/game/avatar";
import { moodMeta } from "@/lib/mood";
import type { CharacterView, TranscriptLine } from "@/lib/types";

/**
 * THE RECORD
 *
 * Four line kinds, each with its own material so the eye can sort them
 * without reading:
 *
 *   • NPC speech   — a raised slate bubble with a bevel and a shadow, plus a
 *                    small tail pointing back at the speaker's portrait.
 *   • Your speech  — a gilt-tinted bubble, right aligned, no portrait.
 *   • Narration    — no bubble at all. Italic serif prose framed by gilt
 *                    hairlines, so the narrator reads as the page rather than
 *                    as another voice in the room.
 *   • Hints        — a gilt card with an icon; unmistakably out-of-world.
 *
 * The container is a `role="log"` live region, so newly arriving dialogue is
 * announced to screen readers instead of appearing silently.
 */
export function Transcript({
  lines,
  characters = [],
  detectiveNames = [],
}: {
  lines: TranscriptLine[];
  characters?: CharacterView[];
  /** Names of AI detective teammates — their lines render on the player's
   *  side (like your own messages) but keep their name label. */
  detectiveNames?: string[];
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines.length]);

  const byId = new Map(characters.map((c) => [c.id, c]));
  const byName = new Map(characters.map((c) => [c.name, c]));
  const detectiveSet = new Set(detectiveNames);

  return (
    <div
      className="space-y-5"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Investigation transcript"
    >
      {lines.map((l, i) => {
        /* ── narration ───────────────────────────────────────────────── */
        if (l.kind === "narration") {
          return (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-[62ch] py-1"
            >
              <div className="rule-gold opacity-25" />
              <p className="type-narration px-1 py-2.5 text-center text-ink-muted">
                {l.text}
              </p>
              <div className="rule-gold opacity-25" />
            </motion.figure>
          );
        }

        /* ── hint / system ───────────────────────────────────────────── */
        if (l.kind === "system") {
          return (
            <motion.aside
              key={i}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "mx-auto flex max-w-[62ch] items-start gap-3 rounded-lg p-3.5",
                "border border-gold/35 bg-gradient-to-b from-gold/[0.1] to-gold/[0.03]",
                "shadow-[0_6px_20px_-10px_hsl(43_60%_30%/0.6),inset_0_1px_0_0_hsl(45_80%_80%/0.12)]"
              )}
            >
              <Lightbulb
                className="mt-0.5 h-4 w-4 shrink-0 text-gold-bright"
                aria-hidden
                strokeWidth={2.2}
              />
              <div>
                <div className="mb-0.5 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-gold/90">
                  Hint
                </div>
                <p className="text-ui leading-relaxed text-ink">{l.text}</p>
              </div>
            </motion.aside>
          );
        }

        /* ── dialogue ────────────────────────────────────────────────── */
        const isYou = l.speaker === "You";
        const isDetective = detectiveSet.has(l.speaker);
        // detective messages sit on the player's side, like your own messages
        const mine = isYou || isDetective;
        const char =
          (l.character_id && byId.get(l.character_id)) ||
          byName.get(l.speaker) ||
          undefined;
        const accent = char ? moodMeta(char.mood).color : "hsl(43 62% 66%)";

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn("flex gap-2.5", mine ? "flex-row-reverse" : "flex-row")}
          >
            {/* portrait, speaker side only (suspects) */}
            {!mine && char && (
              <div className="mt-6 shrink-0">
                <Avatar
                  seed={char.avatar_seed || char.id}
                  gender={char.gender}
                  age={char.age}
                  occupation={char.occupation}
                  mood={char.mood}
                  stress={char.stress}
                  size="sm"
                  ring={accent}
                />
              </div>
            )}

            <div className={cn("flex min-w-0 flex-col", mine && "items-end")}>
              {/* attribution */}
              <div className="mb-1 flex items-center gap-2 px-1">
                <span
                  className={cn(
                    "font-display text-[0.6875rem] font-semibold uppercase tracking-[0.11em]",
                    mine ? "text-gold/90" : "text-ink"
                  )}
                  style={
                    isDetective
                      ? { color: "hsl(190 60% 62%)" }
                      : !mine
                      ? { color: accent }
                      : undefined
                  }
                >
                  {l.speaker}
                </span>
                <span className="type-num text-[0.625rem] text-ink-subtle/75">
                  {l.at_time}
                </span>
              </div>

              {/* the bubble */}
              <div
                className={cn(
                  "relative max-w-[46ch] rounded-xl px-4 py-2.5",
                  "type-dialogue text-ink",
                  mine
                    ? [
                        "border border-gold/30 bg-gradient-to-b from-gold/[0.14] to-gold/[0.05]",
                        "rounded-br-sm",
                        "shadow-[0_6px_18px_-10px_hsl(43_60%_28%/0.7),inset_0_1px_0_0_hsl(45_80%_80%/0.1)]",
                      ]
                    : [
                        "border border-hairline bg-gradient-to-b from-surface-2/85 to-surface/70",
                        "rounded-bl-sm",
                        "shadow-[0_8px_22px_-12px_hsl(222_60%_2%/0.9),inset_0_1px_0_0_hsl(210_40%_100%/0.05)]",
                      ]
                )}
              >
                {l.text}
              </div>
            </div>
          </motion.div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
