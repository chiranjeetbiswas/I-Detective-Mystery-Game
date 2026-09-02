"use client";

import type { Gender, Mood } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHOTO PORTRAIT AVATAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Characters use the illustrated PNGs in /public/avatars (boy1–10, girl1–10).
 *
 * Those source images are FULL-BODY figures: the head sits in the top portion
 * of a tall portrait image and the body fills the rest. Dropped into a small
 * circle as-is, the face would be tiny. So we zoom into the HEAD: the image is
 * scaled up and anchored near the top (`object-position`) inside a round,
 * clipped frame, so the face fills the circle and the body is cropped away.
 *
 *   • FACE_FOCUS  — vertical anchor. Smaller % = show higher up (the head).
 *   • FACE_ZOOM   — how much to enlarge so the head fills the frame.
 *
 * A character always gets the same picture (chosen deterministically from the
 * seed), so faces are stable across renders and reloads.
 */

export type Expression = Mood | "thinking";

const SIZES = { xs: 30, sm: 40, md: 56, lg: 96, xl: 132 } as const;
export type PortraitSize = keyof typeof SIZES;

/** Vertical anchor of the crop: the head sits high in these full-body images. */
const FACE_FOCUS = "50% 15%";
/** Enlarge the image so the head fills the circular frame. */
const FACE_ZOOM = 2.0;

/* deterministic hash so a character keeps the same picture every render */
function fnv1a(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface AvatarProps {
  seed: string;
  gender: Gender;
  size?: PortraitSize;
  /** Ring colour — typically the character's mood colour. */
  ring?: string;
  className?: string;
  /** Kept for API compatibility; announced to assistive tech. */
  mood?: Expression;
  /** Kept for API compatibility. */
  age?: number;
  /** Kept for API compatibility. */
  occupation?: string;
  /** Supplied → the portrait is announced to assistive tech. */
  name?: string;
  /** 0–100. Adds a red pressure vignette at the top end. */
  stress?: number;
  /** Adds the gold selection frame. */
  active?: boolean;
}

export function Avatar({
  seed,
  gender,
  size = "md",
  ring,
  className,
  mood = "calm",
  name,
  stress = 0,
  active = false,
}: AvatarProps) {
  const px = SIZES[size];

  // pick one of the 10 boy / 10 girl pictures, stable per character
  const set = gender === "female" ? "girl" : "boy";
  const index = (fnv1a(seed || "seed") % 10) + 1; // 1..10
  const src = `/avatars/${set}${index}.png`;

  const dread = Math.max(0, Math.min(1, (stress - 55) / 45));

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-surface-2",
        active && "animate-breathe",
        className
      )}
      style={{
        width: px,
        height: px,
        boxShadow: ring
          ? `0 0 0 2px ${ring}, 0 6px 18px -6px hsl(222 60% 2% / 0.8)`
          : "0 6px 18px -6px hsl(222 60% 2% / 0.8)",
      }}
      {...(name
        ? { role: "img", "aria-label": `Portrait of ${name}, appears ${mood}` }
        : { "aria-hidden": true })}
    >
      {/* head-focused crop: cover + top anchor + zoom pushes the face into frame */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name ? `Portrait of ${name}` : ""}
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-cover"
        style={{
          objectPosition: FACE_FOCUS,
          transform: `scale(${FACE_ZOOM})`,
          transformOrigin: FACE_FOCUS,
        }}
      />

      {/* subtle dark vignette so the face reads against busy image edges */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: "inset 0 0 12px 2px hsl(224 60% 3% / 0.45)" }}
      />

      {/* red pressure wash for high stress */}
      {dread > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 52%, transparent 42%, hsl(356 70% 38% / ${
              dread * 0.55
            }) 100%)`,
          }}
        />
      )}
    </div>
  );
}

export default Avatar;
