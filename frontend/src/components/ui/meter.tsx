"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TONES = {
  trust: {
    from: "hsl(168 46% 38%)",
    to: "hsl(168 52% 56%)",
    text: "hsl(168 50% 70%)",
    glow: "hsl(168 50% 50% / 0.45)",
  },
  stress: {
    from: "hsl(30 72% 44%)",
    to: "hsl(38 86% 62%)",
    text: "hsl(30 80% 74%)",
    glow: "hsl(30 80% 55% / 0.45)",
  },
  suspicion: {
    from: "hsl(268 40% 48%)",
    to: "hsl(268 54% 70%)",
    text: "hsl(268 55% 80%)",
    glow: "hsl(268 50% 62% / 0.45)",
  },
} as const;

/**
 * A stat readout, not a progress bar.
 *
 * The track is engraved (inset shadow) and the fill is a gradient with a soft
 * glow at its leading edge, so a value change reads as something physically
 * moving. The fill is spring-animated: when trust drops the bar visibly falls
 * back rather than snapping, which is the entire point — the player should
 * *see* the consequence of what they just said.
 */
export function Meter({
  value,
  label,
  tone = "trust",
  className,
  showValue = true,
}: {
  value: number;
  label: string;
  tone?: keyof typeof TONES;
  className?: string;
  showValue?: boolean;
}) {
  const t = TONES[tone] ?? TONES.trust;
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-micro font-semibold uppercase tracking-[0.1em] text-ink-subtle">
          {label}
        </span>
        {showValue && (
          <span className="type-num text-micro tabular-nums" style={{ color: t.text }}>
            {pct}
          </span>
        )}
      </div>
      <div
        className="relative h-[5px] w-full overflow-hidden rounded-full bg-canvas/80 shadow-[inset_0_1px_2px_hsl(222_60%_2%/0.8)]"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct} of 100`}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            backgroundImage: `linear-gradient(90deg, ${t.from}, ${t.to})`,
            boxShadow: `0 0 8px 0 ${t.glow}`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18, mass: 0.6 }}
        />
        {/* leading-edge highlight */}
        <motion.div
          className="absolute inset-y-0 w-[2px] rounded-full bg-white/50"
          initial={{ left: 0, opacity: 0 }}
          animate={{ left: `calc(${pct}% - 1px)`, opacity: pct > 2 ? 0.5 : 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18, mass: 0.6 }}
        />
      </div>
    </div>
  );
}
