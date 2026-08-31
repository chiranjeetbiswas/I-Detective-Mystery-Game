"use client";

import type { Gender } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Deterministic, gender-based portrait avatar.
 *
 * We draw an inline SVG portrait (head, hair, shoulders) rather than loading a
 * random placeholder image. The palette and a few hair/feature choices are
 * derived from a stable seed (the character id) so the same character always
 * looks the same, while female / male / nonbinary silhouettes differ in a
 * consistent, semi-realistic style.
 */

// warm, muted "detective noir" skin + hair palettes
const SKIN = ["#e8c39e", "#d9a878", "#c68642", "#a9744f", "#8d5524", "#f1d2b6"];
const HAIR = ["#2b1a12", "#4a2c1a", "#6b4423", "#8a6a3b", "#3a3a3a", "#1c1c1c", "#a67c52"];
const BG = ["#2a2320", "#241f2b", "#1f2a2a", "#2b2420", "#26221c", "#221d24"];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], n: number): T {
  return arr[n % arr.length];
}

const SIZES = {
  sm: 40,
  md: 56,
  lg: 96,
};

export function Avatar({
  seed,
  gender,
  size = "md",
  ring,
  className,
}: {
  seed: string;
  gender: Gender;
  size?: keyof typeof SIZES;
  ring?: string; // optional ring colour (e.g. mood)
  className?: string;
}) {
  const px = SIZES[size];
  const h = hashSeed(seed || "seed");
  const skin = pick(SKIN, h);
  const hair = pick(HAIR, Math.floor(h / 7));
  const bg = pick(BG, Math.floor(h / 13));
  const female = gender === "female";
  const male = gender === "male";

  // hair length / shoulder width differ by gender for a recognisable silhouette
  const longHair = female || (!male && h % 2 === 0);

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full", className)}
      style={{
        width: px,
        height: px,
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" width={px} height={px}>
        <rect width="100" height="100" fill={bg} />
        {/* shoulders */}
        <path
          d={
            male
              ? "M12 100 C12 74 30 66 50 66 C70 66 88 74 88 100 Z"
              : "M20 100 C20 76 34 68 50 68 C66 68 80 76 80 100 Z"
          }
          fill={skin}
          opacity="0.55"
        />
        {/* long hair behind head (female / some nonbinary) */}
        {longHair && (
          <path
            d="M26 44 C26 22 40 14 50 14 C60 14 74 22 74 44 L74 74 C74 66 70 60 66 58 L66 40 C66 30 58 26 50 26 C42 26 34 30 34 40 L34 58 C30 60 26 66 26 74 Z"
            fill={hair}
          />
        )}
        {/* neck */}
        <rect x="44" y="56" width="12" height="16" rx="4" fill={skin} />
        {/* face */}
        <ellipse cx="50" cy="42" rx="18" ry="21" fill={skin} />
        {/* top hair */}
        <path
          d={
            male
              ? "M31 40 C31 22 42 16 50 16 C58 16 69 22 69 40 C64 32 58 30 50 30 C42 30 36 32 31 40 Z"
              : "M30 42 C30 20 42 14 50 14 C58 14 70 20 70 42 C66 30 58 27 50 27 C42 27 34 30 30 42 Z"
          }
          fill={hair}
        />
        {/* eyes */}
        <circle cx="43" cy="42" r="2.2" fill="#241c14" />
        <circle cx="57" cy="42" r="2.2" fill="#241c14" />
        {/* brows */}
        <rect x="40" y="37" width="6" height="1.6" rx="0.8" fill={hair} />
        <rect x="54" y="37" width="6" height="1.6" rx="0.8" fill={hair} />
        {/* mouth */}
        <path d="M45 51 Q50 54 55 51" stroke="#5a3a2a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}
