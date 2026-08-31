"use client";

import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Gender, Mood } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PORTRAIT ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Draws a semi-realistic illustrated portrait as inline SVG. Nothing is
 * loaded from the network and no two characters look alike.
 *
 * Every visual trait — face geometry, skin tone, hair style and colour, eye
 * colour, clothing, facial hair, accessories — is derived deterministically
 * from the character's seed, so a given character is pixel-identical on every
 * render and across reloads, while the cast as a whole looks varied.
 *
 * `age` and `occupation` feed real signal into the drawing: greying and
 * slackening features with age, and profession-appropriate clothing.
 *
 * `mood` drives the expression through a parameter table (brow height and
 * tilt, lid aperture, gaze direction, mouth curvature, tension, perspiration)
 * rather than a set of hand-drawn faces, so all seven moods work on all faces.
 *
 * LIGHTING follows a three-point noir setup, which is what makes these read
 * as illustrations rather than clip art:
 *   • a warm key from the upper left
 *   • a cool slate fill from the lower right
 *   • a hard gold rim clipped to the right edge of the silhouette
 */

export type Expression = Mood | "thinking";

const SIZES = { xs: 30, sm: 40, md: 56, lg: 96, xl: 132 } as const;
export type PortraitSize = keyof typeof SIZES;

/* ═══════════════════════ deterministic randomness ═══════════════════════ */

function fnv1a(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small, fast, well-distributed PRNG so traits vary independently. */
function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ═══════════════════════════════ palettes ═══════════════════════════════ */

/** [base, shadow, highlight] — a realistic span of tones. */
const SKIN: [string, string, string][] = [
  ["#f4d8c0", "#d9ab86", "#fdeeda"],
  ["#eac9a4", "#c8916a", "#f9dfc8"],
  ["#dcae82", "#b57e52", "#efd0ac"],
  ["#c88c53", "#9c6430", "#ddab74"],
  ["#ad7852", "#7e4e2f", "#c79a70"],
  ["#8f5a2c", "#63381a", "#ab7546"],
  ["#6d452a", "#472716", "#8b5f3b"],
  ["#54331f", "#331c0f", "#71492e"],
];

/** [base, highlight] hair colours, including greys for older characters. */
const HAIR: [string, string][] = [
  ["#14110f", "#2e2823"],
  ["#241a12", "#3f2e1f"],
  ["#3a2416", "#583823"],
  ["#5a3a1e", "#7e5b2f"],
  ["#7b5a2f", "#a58046"],
  ["#a8823c", "#cbab63"],
  ["#8b5a3b", "#b17b53"],
  ["#4a1f1a", "#6f3329"],
  ["#3d3d40", "#5c5c60"],
];
const HAIR_GREY: [string, string][] = [
  ["#6e6e72", "#98989d"],
  ["#8e8b86", "#b8b5af"],
  ["#c3beb6", "#e2ded7"],
];

const EYES = ["#4a2f1c", "#33200f", "#6b4a22", "#4e6b3f", "#3f6070", "#5c6670", "#8a6a2c"];

/** [base, highlight] garment colours — desaturated, evening-appropriate. */
const CLOTH: [string, string][] = [
  ["#1b2436", "#2b3852"], // navy
  ["#22242a", "#34373f"], // charcoal
  ["#1d2b26", "#2d4139"], // deep green
  ["#2b1a1f", "#452730"], // burgundy
  ["#242a33", "#3a424e"], // slate
  ["#15171c", "#24272f"], // black tie
  ["#3a352d", "#514b40"], // taupe
  ["#251c2e", "#3a2c47"], // plum
];

/* ════════════════════════════ garment styles ════════════════════════════ */

type Garment =
  | "suit-tie"
  | "suit-open"
  | "uniform"
  | "turtleneck"
  | "blouse"
  | "waistcoat"
  | "gown"
  | "coat";

/** Occupation drives clothing where there's an obvious read, hash otherwise. */
function pickGarment(occupation: string, rnd: () => number, gender: Gender): Garment {
  const o = (occupation || "").toLowerCase();
  const has = (...w: string[]) => w.some((x) => o.includes(x));

  if (has("captain", "officer", "crew", "purser", "steward", "guard", "police", "pilot"))
    return "uniform";
  if (has("doctor", "nurse", "chef", "scientist", "researcher")) return "coat";
  if (has("waiter", "sommelier", "wine", "butler", "bartender")) return "waistcoat";
  if (has("art", "curator", "professor", "writer", "author", "critic")) 
    return rnd() < 0.5 ? "turtleneck" : "waistcoat";
  if (has("heir", "banker", "business", "lawyer", "broker", "executive", "rich"))
    return rnd() < 0.6 ? "suit-tie" : "suit-open";
  if (has("singer", "actor", "dancer", "star", "model", "socialite")) return "gown";

  const pool: Garment[] =
    gender === "female"
      ? ["blouse", "gown", "turtleneck", "suit-open", "waistcoat"]
      : gender === "male"
        ? ["suit-tie", "suit-open", "turtleneck", "waistcoat", "coat"]
        : ["suit-open", "turtleneck", "blouse", "waistcoat", "coat"];
  return pool[Math.floor(rnd() * pool.length)];
}

/* ═════════════════════════════ hair styles ══════════════════════════════ */

type HairStyle =
  | "slick"
  | "sidepart"
  | "crop"
  | "curls"
  | "long"
  | "bob"
  | "updo"
  | "ponytail"
  | "afro"
  | "receding"
  | "waves";

function pickHair(rnd: () => number, gender: Gender, age: number): HairStyle {
  const masc: HairStyle[] = ["slick", "sidepart", "crop", "curls", "receding", "afro", "waves"];
  const fem: HairStyle[] = ["long", "bob", "updo", "ponytail", "curls", "waves", "sidepart"];
  const neu: HairStyle[] = ["crop", "bob", "curls", "waves", "sidepart", "ponytail", "afro"];
  let pool = gender === "male" ? masc : gender === "female" ? fem : neu;
  // receding hairlines only really appear on older masculine silhouettes
  if (age < 40) pool = pool.filter((h) => h !== "receding");
  return pool[Math.floor(rnd() * pool.length)];
}

/* ════════════════════════════ expression table ══════════════════════════ */

interface ExprParams {
  browY: number;      // + lowers the brow (anger), − raises it (fear)
  browTilt: number;   // − = inner end down (glare), + = inner end up (worry)
  browArch: number;   // vertical scale of the arch
  lidTop: number;     // fraction of the eye the upper lid covers
  pupilDx: number;    // gaze offset
  pupilDy: number;
  mouthCurve: number; // + smile, − frown
  mouthOpen: number;  // 0…1
  mouthWidth: number;
  asym: number;       // one-sided smirk
  sweat: 0 | 1 | 2;
  tension: number;    // nostril flare, jaw set, neck cords
}

const EXPR: Record<Expression, ExprParams> = {
  calm: {
    browY: 0, browTilt: 0, browArch: 1, lidTop: 0.13, pupilDx: 0, pupilDy: 0,
    mouthCurve: 0.2, mouthOpen: 0.02, mouthWidth: 1, asym: 0, sweat: 0, tension: 0,
  },
  happy: {
    browY: -0.9, browTilt: -1, browArch: 1.18, lidTop: 0.3, pupilDx: 0, pupilDy: 0.1,
    mouthCurve: 0.95, mouthOpen: 0.2, mouthWidth: 1.09, asym: 0, sweat: 0, tension: 0,
  },
  confident: {
    browY: -0.4, browTilt: -3, browArch: 0.9, lidTop: 0.21, pupilDx: 0.3, pupilDy: 0,
    mouthCurve: 0.45, mouthOpen: 0.05, mouthWidth: 1.02, asym: 0.85, sweat: 0, tension: 0.1,
  },
  suspicious: {
    browY: 1.3, browTilt: -6, browArch: 0.68, lidTop: 0.47, pupilDx: 1.5, pupilDy: 0,
    mouthCurve: -0.14, mouthOpen: 0, mouthWidth: 0.9, asym: 0.4, sweat: 0, tension: 0.22,
  },
  nervous: {
    browY: -1.7, browTilt: 5.5, browArch: 1.1, lidTop: 0.04, pupilDx: -1.3, pupilDy: -0.7,
    mouthCurve: -0.32, mouthOpen: 0.13, mouthWidth: 0.87, asym: 0.2, sweat: 1, tension: 0.28,
  },
  scared: {
    browY: -3.1, browTilt: 9.5, browArch: 1.28, lidTop: -0.3, pupilDx: 0, pupilDy: -1,
    mouthCurve: -0.5, mouthOpen: 0.58, mouthWidth: 0.9, asym: 0, sweat: 2, tension: 0.5,
  },
  angry: {
    browY: 2.5, browTilt: -11.5, browArch: 0.52, lidTop: 0.35, pupilDx: 0, pupilDy: 0.1,
    mouthCurve: -0.72, mouthOpen: 0.14, mouthWidth: 1.03, asym: 0, sweat: 0, tension: 0.85,
  },
  thinking: {
    browY: 0.6, browTilt: -4, browArch: 0.95, lidTop: 0.29, pupilDx: 2.3, pupilDy: -0.9,
    mouthCurve: 0.06, mouthOpen: 0, mouthWidth: 0.94, asym: 0.55, sweat: 0, tension: 0.05,
  },
};

/* ═══════════════════════════ feature derivation ═════════════════════════ */

interface Features {
  skin: [string, string, string];
  hair: [string, string];
  eye: string;
  cloth: [string, string];
  hairStyle: HairStyle;
  garment: Garment;
  /* geometry */
  faceW: number;
  jawTaper: number;
  lenAdj: number;
  eyeSpread: number;
  eyeSize: number;
  noseW: number;
  browThick: number;
  lipFull: number;
  /* extras */
  beard: 0 | 1 | 2 | 3; // none | stubble | moustache | full
  glasses: boolean;
  earring: boolean;
  ageLines: number; // 0…1
}

function buildFeatures(
  seed: string,
  gender: Gender,
  age: number,
  occupation: string
): Features {
  const rnd = mulberry32(fnv1a(seed || "seed"));
  // burn a few values so short/similar seeds diverge quickly
  rnd(); rnd();

  const skin = SKIN[Math.floor(rnd() * SKIN.length)];

  // hair greys progressively: rare at 40, common past 60
  const greyChance = age >= 65 ? 0.75 : age >= 52 ? 0.42 : age >= 42 ? 0.16 : 0.02;
  const hair =
    rnd() < greyChance
      ? HAIR_GREY[Math.floor(rnd() * HAIR_GREY.length)]
      : HAIR[Math.floor(rnd() * HAIR.length)];

  const masc = gender === "male";
  const fem = gender === "female";

  return {
    skin,
    hair,
    eye: EYES[Math.floor(rnd() * EYES.length)],
    cloth: CLOTH[Math.floor(rnd() * CLOTH.length)],
    hairStyle: pickHair(rnd, gender, age),
    garment: pickGarment(occupation, rnd, gender),

    faceW: (masc ? 18.4 : fem ? 17.0 : 17.7) + rnd() * 2.1,
    jawTaper: (masc ? 0.78 : fem ? 0.6 : 0.68) + rnd() * 0.14,
    lenAdj: -1.4 + rnd() * 3.2,
    eyeSpread: 7.6 + rnd() * 1.4,
    eyeSize: 2.95 + rnd() * 0.6,
    noseW: (masc ? 3.5 : 3.0) + rnd() * 1.2,
    browThick: (masc ? 2.0 : 1.45) + rnd() * 0.7,
    lipFull: (fem ? 1.2 : 0.95) + rnd() * 0.35,

    beard: masc && age > 24 ? (Math.floor(rnd() * 4) as 0 | 1 | 2 | 3) : 0,
    glasses: rnd() < (age > 48 ? 0.34 : 0.2),
    earring: fem ? rnd() < 0.55 : rnd() < 0.12,
    ageLines: Math.max(0, Math.min(1, (age - 34) / 34)),
  };
}

/* ══════════════════════════ geometry generators ═════════════════════════ */

/** The head silhouette: crown → temple → cheekbone → jaw → chin, mirrored. */
function facePath(f: Features, eyeY: number, chinY: number): string {
  const w = f.faceW;
  const j = w * f.jawTaper;
  const crown = eyeY - 24 + f.lenAdj * 0.3;
  const cheek = eyeY + 5;
  return [
    `M 50 ${crown}`,
    `C ${50 + w * 0.8} ${crown} ${50 + w} ${crown + 9} ${50 + w} ${cheek}`,
    `C ${50 + w} ${cheek + 6} ${50 + j + 1.4} ${chinY - 8} ${50 + j * 0.6} ${chinY - 2.4}`,
    `C ${50 + j * 0.3} ${chinY + 0.4} 50 ${chinY} 50 ${chinY}`,
    `C 50 ${chinY} ${50 - j * 0.3} ${chinY + 0.4} ${50 - j * 0.6} ${chinY - 2.4}`,
    `C ${50 - j - 1.4} ${chinY - 8} ${50 - w} ${cheek + 6} ${50 - w} ${cheek}`,
    `C ${50 - w} ${crown + 9} ${50 - w * 0.8} ${crown} 50 ${crown}`,
    "Z",
  ].join(" ");
}

/** Lips. Returns the outline stroke and, when open, the dark interior. */
function mouthShapes(cx: number, my: number, f: Features, e: ExprParams) {
  const w = 11.2 * e.mouthWidth * (0.94 + f.lipFull * 0.12);
  const half = w / 2;
  const l = cx - half;
  const r = cx + half;
  const dip = e.mouthCurve * 4.2;
  const tilt = e.asym * 1.5;
  const open = e.mouthOpen * 6.2;

  // the seam between the lips
  const seam = `M ${l} ${my + tilt} Q ${cx} ${my - dip} ${r} ${my - tilt}`;

  // upper and lower lip bodies
  const upper =
    `M ${l} ${my + tilt} Q ${cx - half * 0.45} ${my - dip - 2.1 * f.lipFull} ${cx} ${my - dip * 0.55 - 0.5}` +
    ` Q ${cx + half * 0.45} ${my - dip - 2.1 * f.lipFull} ${r} ${my - tilt}` +
    ` Q ${cx} ${my - dip} ${l} ${my + tilt} Z`;
  const lower =
    `M ${l} ${my + tilt} Q ${cx} ${my - dip} ${r} ${my - tilt}` +
    ` Q ${cx + half * 0.4} ${my - dip + 3.1 * f.lipFull + open} ${cx} ${my - dip + 3.4 * f.lipFull + open}` +
    ` Q ${cx - half * 0.4} ${my - dip + 3.1 * f.lipFull + open} ${l} ${my + tilt} Z`;

  const interior =
    open > 0.4
      ? `M ${l + 1} ${my + tilt} Q ${cx} ${my - dip} ${r - 1} ${my - tilt}` +
        ` Q ${cx} ${my - dip + open * 1.5} ${l + 1} ${my + tilt} Z`
      : null;

  return { seam, upper, lower, interior };
}

/* ══════════════════════════════ hair drawing ════════════════════════════ */

function HairBack({ f, eyeY, chinY }: { f: Features; eyeY: number; chinY: number }) {
  const w = f.faceW;
  const crown = eyeY - 24 + f.lenAdj * 0.3;
  const s = f.hairStyle;

  if (s === "long" || s === "waves") {
    return (
      <path
        d={`M ${50 - w - 1.8} ${crown + 8} C ${50 - w - 3.6} ${eyeY + 16} ${50 - w - 2.6} ${chinY + 12} ${50 - w - 0.4} ${chinY + 18}
            L ${50 + w + 0.4} ${chinY + 18} C ${50 + w + 2.6} ${chinY + 12} ${50 + w + 3.6} ${eyeY + 16} ${50 + w + 1.8} ${crown + 8}
            C ${50 + w} ${crown - 4} ${50 - w} ${crown - 4} ${50 - w - 1.8} ${crown + 8} Z`}
        fill={f.hair[0]}
      />
    );
  }
  if (s === "bob") {
    return (
      <path
        d={`M ${50 - w - 2.6} ${crown + 7} C ${50 - w - 4.4} ${eyeY + 8} ${50 - w - 3.4} ${eyeY + 19} ${50 - w - 1.6} ${eyeY + 23}
            L ${50 + w + 1.6} ${eyeY + 23} C ${50 + w + 3.4} ${eyeY + 19} ${50 + w + 4.4} ${eyeY + 8} ${50 + w + 2.6} ${crown + 7}
            C ${50 + w} ${crown - 4} ${50 - w} ${crown - 4} ${50 - w - 2.6} ${crown + 7} Z`}
        fill={f.hair[0]}
      />
    );
  }
  if (s === "ponytail") {
    return (
      <>
        <path
          d={`M ${50 - w - 1.5} ${crown + 8} C ${50 - w - 2.5} ${eyeY + 4} ${50 - w - 2} ${eyeY + 10} ${50 - w} ${eyeY + 12}
              L ${50 + w} ${eyeY + 12} C ${50 + w + 2} ${eyeY + 10} ${50 + w + 2.5} ${eyeY + 4} ${50 + w + 1.5} ${crown + 8} Z`}
          fill={f.hair[0]}
        />
        <path
          d={`M ${50 + w - 1} ${crown + 11} C ${50 + w + 9} ${crown + 13} ${50 + w + 12} ${eyeY + 12} ${50 + w + 6} ${eyeY + 22}
              C ${50 + w + 4} ${eyeY + 16} ${50 + w + 2} ${eyeY + 6} ${50 + w - 3} ${crown + 15} Z`}
          fill={f.hair[0]}
        />
      </>
    );
  }
  if (s === "updo") {
    return (
      <circle cx={50} cy={crown - 2.5} r={7.6} fill={f.hair[0]} />
    );
  }
  if (s === "afro") {
    return <circle cx={50} cy={crown + 7} r={w + 3.6} fill={f.hair[0]} />;
  }
  if (s === "curls") {
    // Hugs the skull rather than floating above it: smaller lobes, seated
    // lower, and pulled inward so the silhouette reads as hair not headwear.
    return (
      <g fill={f.hair[0]}>
        {[-1, -0.55, 0, 0.55, 1].map((t, i) => (
          <circle
            key={i}
            cx={50 + t * (w * 0.82)}
            cy={crown + 7.4 + Math.abs(t) * 4.2}
            r={5.5}
          />
        ))}
      </g>
    );
  }
  return null;
}

function HairFront({ f, eyeY }: { f: Features; eyeY: number }) {
  const w = f.faceW;
  const crown = eyeY - 24 + f.lenAdj * 0.3;
  const s = f.hairStyle;
  // Where the hairline sits on the forehead. This single number is the
  // difference between "hair" and "swim cap": it must leave a genuine
  // expanse of forehead between the brow and the hair.
  const hl = s === "receding" ? eyeY - 17.5 : eyeY - 13.6;

  const common = { fill: f.hair[0] };

  switch (s) {
    case "slick":
      return (
        <path
          {...common}
          d={`M ${50 - w - 0.6} ${eyeY - 2} C ${50 - w - 1.6} ${crown + 4} ${50 - w * 0.55} ${crown - 3.4} 50 ${crown - 3.4}
              C ${50 + w * 0.55} ${crown - 3.4} ${50 + w + 1.6} ${crown + 4} ${50 + w + 0.6} ${eyeY - 2}
              C ${50 + w * 0.7} ${hl - 1.5} ${50 - w * 0.7} ${hl - 1.5} ${50 - w - 0.6} ${eyeY - 2} Z`}
        />
      );
    case "sidepart":
      return (
        <path
          {...common}
          d={`M ${50 - w - 0.8} ${eyeY - 1} C ${50 - w - 2} ${crown + 3} ${50 - w * 0.5} ${crown - 4} ${50 + 2} ${crown - 3.6}
              C ${50 + w * 0.75} ${crown - 3} ${50 + w + 1.8} ${crown + 5} ${50 + w + 0.8} ${eyeY - 1}
              C ${50 + w * 0.6} ${hl + 1.2} ${50 - w * 0.2} ${hl - 2.4} ${50 - w * 0.85} ${hl + 1}
              C ${50 - w * 0.95} ${hl + 2.6} ${50 - w} ${eyeY - 3} ${50 - w - 0.8} ${eyeY - 1} Z`}
        />
      );
    case "crop":
      return (
        <path
          {...common}
          d={`M ${50 - w - 0.3} ${eyeY - 4} C ${50 - w - 1} ${crown + 4} ${50 - w * 0.55} ${crown - 2} 50 ${crown - 2}
              C ${50 + w * 0.55} ${crown - 2} ${50 + w + 1} ${crown + 4} ${50 + w + 0.3} ${eyeY - 4}
              C ${50 + w * 0.7} ${hl + 0.6} ${50 - w * 0.7} ${hl + 0.6} ${50 - w - 0.3} ${eyeY - 4} Z`}
        />
      );
    case "receding":
      return (
        <path
          {...common}
          d={`M ${50 - w - 0.4} ${eyeY - 3} C ${50 - w - 1.2} ${crown + 6} ${50 - w * 0.5} ${crown + 1} 50 ${crown + 1.6}
              C ${50 + w * 0.5} ${crown + 1} ${50 + w + 1.2} ${crown + 6} ${50 + w + 0.4} ${eyeY - 3}
              C ${50 + w * 0.62} ${hl + 3.4} ${50 + w * 0.3} ${hl + 0.8} 50 ${hl + 1.2}
              C ${50 - w * 0.3} ${hl + 0.8} ${50 - w * 0.62} ${hl + 3.4} ${50 - w - 0.4} ${eyeY - 3} Z`}
        />
      );
    case "long":
    case "waves":
    case "bob":
    case "ponytail":
      return (
        <path
          {...common}
          d={`M ${50 - w - 1.2} ${eyeY - 1} C ${50 - w - 2.4} ${crown + 2} ${50 - w * 0.5} ${crown - 4.6} 50 ${crown - 4.4}
              C ${50 + w * 0.5} ${crown - 4.6} ${50 + w + 2.4} ${crown + 2} ${50 + w + 1.2} ${eyeY - 1}
              C ${50 + w * 0.8} ${hl - 0.4} ${50 + w * 0.2} ${hl - 3} ${50 - w * 0.35} ${hl - 1.2}
              C ${50 - w * 0.8} ${hl + 0.4} ${50 - w * 0.95} ${eyeY - 4} ${50 - w - 1.2} ${eyeY - 1} Z`}
        />
      );
    case "updo":
      return (
        <path
          {...common}
          d={`M ${50 - w - 0.6} ${eyeY - 3} C ${50 - w - 1.4} ${crown + 5} ${50 - w * 0.5} ${crown - 1.4} 50 ${crown - 1.4}
              C ${50 + w * 0.5} ${crown - 1.4} ${50 + w + 1.4} ${crown + 5} ${50 + w + 0.6} ${eyeY - 3}
              C ${50 + w * 0.68} ${hl + 1.4} ${50 - w * 0.68} ${hl + 1.4} ${50 - w - 0.6} ${eyeY - 3} Z`}
        />
      );
    case "afro":
    case "curls":
      return (
        <path
          {...common}
          d={`M ${50 - w - 0.5} ${eyeY - 3.5} C ${50 - w - 1.5} ${crown + 3} ${50 - w * 0.5} ${crown - 1} 50 ${crown - 1}
              C ${50 + w * 0.5} ${crown - 1} ${50 + w + 1.5} ${crown + 3} ${50 + w + 0.5} ${eyeY - 3.5}
              C ${50 + w * 0.7} ${hl + 1.8} ${50 - w * 0.7} ${hl + 1.8} ${50 - w - 0.5} ${eyeY - 3.5} Z`}
        />
      );
    default:
      return null;
  }
}

/* ═══════════════════════════ garment drawing ════════════════════════════ */

function Garments({ f, chinY, uid }: { f: Features; chinY: number; uid: string }) {
  const y = chinY + 6; // shoulder line
  const [base, hi] = f.cloth;
  const g = f.garment;

  // shoulders — broader for tailoring, softer for blouses and gowns
  const broad = g === "suit-tie" || g === "suit-open" || g === "uniform" || g === "coat";
  const shoulder = broad
    ? `M 6 100 C 7 ${y + 7} 26 ${y} 50 ${y} C 74 ${y} 93 ${y + 7} 94 100 Z`
    : `M 13 100 C 14 ${y + 9} 30 ${y + 2} 50 ${y + 2} C 70 ${y + 2} 86 ${y + 9} 87 100 Z`;

  return (
    <g>
      <path d={shoulder} fill={`url(#${uid}-cloth)`} />

      {/* neckline / collar treatments */}
      {(g === "suit-tie" || g === "suit-open") && (
        <>
          {/* shirt V */}
          <path
            d={`M ${50 - 9} ${y + 1} L 50 ${y + 15} L ${50 + 9} ${y + 1} L ${50 + 5} ${y - 1} L 50 ${y + 6} L ${50 - 5} ${y - 1} Z`}
            fill="#d8d4cc"
          />
          {/* lapels */}
          <path d={`M ${50 - 9.5} ${y + 0.5} L ${50 - 1.5} ${y + 15} L ${50 - 17} ${y + 20} L ${50 - 15} ${y + 3} Z`} fill={hi} opacity="0.75" />
          <path d={`M ${50 + 9.5} ${y + 0.5} L ${50 + 1.5} ${y + 15} L ${50 + 17} ${y + 20} L ${50 + 15} ${y + 3} Z`} fill={hi} opacity="0.55" />
          {g === "suit-tie" && (
            <>
              <path d={`M 50 ${y + 5} L ${50 - 2.6} ${y + 8.5} L 50 ${y + 12} L ${50 + 2.6} ${y + 8.5} Z`} fill="#6d1f28" />
              <path d={`M ${50 - 2.2} ${y + 11} L ${50 + 2.2} ${y + 11} L ${50 + 3.4} 100 L ${50 - 3.4} 100 Z`} fill="#83262f" />
            </>
          )}
        </>
      )}

      {g === "uniform" && (
        <>
          {/* double-breasted front with a gold band */}
          <path d={`M ${50 - 10} ${y + 1} L 50 ${y + 10} L ${50 + 10} ${y + 1} L ${50 + 8} ${y - 1} L 50 ${y + 5} L ${50 - 8} ${y - 1} Z`} fill="#e8e4dc" />
          <rect x={50 - 20} y={y + 13} width={40} height={3.2} fill="hsl(43 52% 55%)" opacity="0.85" />
          {/* epaulettes */}
          <rect x={16} y={y + 6} width={13} height={3.4} rx={1.5} fill="hsl(43 52% 58%)" opacity="0.9" />
          <rect x={71} y={y + 6} width={13} height={3.4} rx={1.5} fill="hsl(43 52% 58%)" opacity="0.75" />
          {/* buttons */}
          <circle cx={50 - 7} cy={y + 20} r={1.5} fill="hsl(43 60% 62%)" />
          <circle cx={50 + 7} cy={y + 20} r={1.5} fill="hsl(43 60% 62%)" />
        </>
      )}

      {g === "turtleneck" && (
        <path
          d={`M ${50 - 11} ${y - 2} C ${50 - 11} ${y + 6} ${50 + 11} ${y + 6} ${50 + 11} ${y - 2}
              C ${50 + 11} ${y - 7} ${50 - 11} ${y - 7} ${50 - 11} ${y - 2} Z`}
          fill={hi}
        />
      )}

      {g === "blouse" && (
        <>
          <path d={`M ${50 - 11} ${y} C ${50 - 8} ${y + 12} ${50 + 8} ${y + 12} ${50 + 11} ${y} L ${50 + 7} ${y - 2} C ${50 + 5} ${y + 7} ${50 - 5} ${y + 7} ${50 - 7} ${y - 2} Z`} fill={hi} />
          <path d={`M ${50 - 13} ${y + 1} L ${50 - 4} ${y + 11} L ${50 - 15} ${y + 14} Z`} fill={hi} opacity="0.6" />
          <path d={`M ${50 + 13} ${y + 1} L ${50 + 4} ${y + 11} L ${50 + 15} ${y + 14} Z`} fill={hi} opacity="0.45" />
        </>
      )}

      {g === "waistcoat" && (
        <>
          <path d={`M ${50 - 10} ${y} L 50 ${y + 13} L ${50 + 10} ${y} L ${50 + 6} ${y - 2} L 50 ${y + 6} L ${50 - 6} ${y - 2} Z`} fill="#ddd8ce" />
          <path d={`M ${50 - 16} ${y + 3} L ${50 - 2} ${y + 16} L ${50 - 18} ${y + 21} Z`} fill={hi} opacity="0.8" />
          <path d={`M ${50 + 16} ${y + 3} L ${50 + 2} ${y + 16} L ${50 + 18} ${y + 21} Z`} fill={hi} opacity="0.6" />
          <circle cx={50} cy={y + 19} r={1.3} fill="hsl(43 45% 55%)" />
        </>
      )}

      {g === "gown" && (
        <>
          <path d={`M ${50 - 14} ${y + 2} C ${50 - 10} ${y + 14} ${50 + 10} ${y + 14} ${50 + 14} ${y + 2} L ${50 + 12} ${y} C ${50 + 8} ${y + 9} ${50 - 8} ${y + 9} ${50 - 12} ${y} Z`} fill={hi} opacity="0.9" />
          {/* a single strand of pearls */}
          <path d={`M ${50 - 8} ${y + 1} Q 50 ${y + 8} ${50 + 8} ${y + 1}`} stroke="hsl(43 40% 78%)" strokeWidth="0.9" fill="none" opacity="0.85" />
        </>
      )}

      {g === "coat" && (
        <>
          <path d={`M ${50 - 9} ${y} L 50 ${y + 12} L ${50 + 9} ${y} L ${50 + 6} ${y - 2} L 50 ${y + 5} L ${50 - 6} ${y - 2} Z`} fill="#e3e0d8" />
          <path d={`M ${50 - 18} ${y + 2} L ${50 - 3} ${y + 15} L ${50 - 20} ${y + 22} Z`} fill={hi} opacity="0.7" />
          <path d={`M ${50 + 18} ${y + 2} L ${50 + 3} ${y + 15} L ${50 + 20} ${y + 22} Z`} fill={hi} opacity="0.5" />
        </>
      )}
    </g>
  );
}

/* ═════════════════════════════ the component ════════════════════════════ */

export interface AvatarProps {
  seed: string;
  gender: Gender;
  size?: PortraitSize;
  /** Ring colour — typically the character's mood colour. */
  ring?: string;
  className?: string;
  /** Drives the expression. Defaults to `calm`. */
  mood?: Expression;
  /** Ages the face: greying, eye bags, nasolabial folds. */
  age?: number;
  /** Chooses profession-appropriate clothing. */
  occupation?: string;
  /** Supplied → the portrait is announced to assistive tech. */
  name?: string;
  /** 0–100. Adds a red pressure vignette and a clammy sheen at the top end. */
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
  age = 40,
  occupation = "",
  name,
  stress = 0,
  active = false,
}: AvatarProps) {
  const px = SIZES[size];
  const uid = useId().replace(/:/g, "");
  const f = buildFeatures(seed || "seed", gender, age, occupation);
  const e = EXPR[mood] ?? EXPR.calm;

  // vertical anatomy
  const eyeY = 41 + f.lenAdj * 0.55;
  const chinY = eyeY + 23.5 + f.lenAdj;
  const noseY = eyeY + 8.4;
  const mouthY = eyeY + 15.4;
  const face = facePath(f, eyeY, chinY);
  const mouth = mouthShapes(50, mouthY, f, e);

  // detail is dropped at small sizes so the portrait stays legible
  const detail = px >= 52;
  const fine = px >= 84;

  const eyeX = f.eyeSpread;
  const lidCover = f.eyeSize * 2 * Math.max(0, e.lidTop);
  const dread = Math.max(0, Math.min(1, (stress - 55) / 45));

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full",
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
      <svg viewBox="0 0 100 100" width={px} height={px} shapeRendering="geometricPrecision">
        <defs>
          {/* studio backdrop: cool navy with a warm pool behind the key side */}
          <radialGradient id={`${uid}-bg`} cx="32%" cy="24%" r="88%">
            <stop offset="0%" stopColor="hsl(214 30% 22%)" />
            <stop offset="55%" stopColor="hsl(220 38% 11%)" />
            <stop offset="100%" stopColor="hsl(224 46% 5%)" />
          </radialGradient>

          {/* skin: key light upper-left → shadow lower-right */}
          <linearGradient id={`${uid}-skin`} x1="18%" y1="8%" x2="88%" y2="96%">
            <stop offset="0%" stopColor={f.skin[2]} />
            <stop offset="42%" stopColor={f.skin[0]} />
            <stop offset="100%" stopColor={f.skin[1]} />
          </linearGradient>

          <linearGradient id={`${uid}-hair`} x1="20%" y1="0%" x2="85%" y2="90%">
            <stop offset="0%" stopColor={f.hair[1]} />
            <stop offset="60%" stopColor={f.hair[0]} />
            <stop offset="100%" stopColor={f.hair[0]} />
          </linearGradient>

          <linearGradient id={`${uid}-cloth`} x1="14%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor={f.cloth[1]} />
            <stop offset="58%" stopColor={f.cloth[0]} />
            <stop offset="100%" stopColor="hsl(224 40% 5%)" />
          </linearGradient>

          {/* cool fill light creeping in from the lower right */}
          <linearGradient id={`${uid}-fill`} x1="100%" y1="100%" x2="30%" y2="20%">
            <stop offset="0%" stopColor="hsl(210 70% 60%)" stopOpacity="0.2" />
            <stop offset="55%" stopColor="hsl(210 70% 60%)" stopOpacity="0" />
          </linearGradient>

          {/* corner vignette inside the portrait crop */}
          <radialGradient id={`${uid}-vig`} cx="50%" cy="44%" r="72%">
            <stop offset="55%" stopColor="hsl(224 60% 2%)" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(224 60% 2%)" stopOpacity="0.62" />
          </radialGradient>

          {/* red pressure wash for high stress */}
          <radialGradient id={`${uid}-dread`} cx="50%" cy="52%" r="70%">
            <stop offset="40%" stopColor="hsl(356 70% 40%)" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(356 70% 38%)" stopOpacity="0.55" />
          </radialGradient>

          {/* clip used to confine the gold rim light to the right edge */}
          <clipPath id={`${uid}-right`}>
            <rect x="50" y="0" width="50" height="100" />
          </clipPath>
          <clipPath id={`${uid}-face`}>
            <path d={face} />
          </clipPath>
        </defs>

        {/* ── backdrop ── */}
        <rect width="100" height="100" fill={`url(#${uid}-bg)`} />

        {/*
          FIGURE GROUP — scaled up about the head's centre so the face fills
          roughly two thirds of the crop, the way a real portrait is framed.
          The backdrop and the lighting pass stay outside this transform so
          the vignette and rim stay anchored to the frame, not the head.
        */}
        <g transform="translate(50, 43) scale(1.2) translate(-50, -41)">
          {/* ── hair behind the head, then the body ── */}
          <HairBack f={f} eyeY={eyeY} chinY={chinY} />
          <Garments f={f} chinY={chinY} uid={uid} />

        {/* ── neck, with a hard contact shadow under the jaw ── */}
        <path
          d={`M ${50 - 6.4} ${chinY - 7} L ${50 - 7.6} ${chinY + 11} L ${50 + 7.6} ${chinY + 11} L ${50 + 6.4} ${chinY - 7} Z`}
          fill={f.skin[0]}
        />
        <path
          d={`M ${50 - 6.4} ${chinY - 7} L ${50 - 7.6} ${chinY + 11} L ${50 + 7.6} ${chinY + 11} L ${50 + 6.4} ${chinY - 7} Z`}
          fill={f.skin[1]}
          opacity="0.62"
        />
        <ellipse cx={50} cy={chinY - 1.5} rx={8.4} ry={4.6} fill={f.skin[1]} opacity="0.55" />

        {/* ── ears ── */}
        <ellipse cx={50 - f.faceW - 0.4} cy={eyeY + 3.4} rx={2.5} ry={4} fill={f.skin[1]} />
        <ellipse cx={50 + f.faceW + 0.4} cy={eyeY + 3.4} rx={2.5} ry={4} fill={f.skin[1]} />
        {f.earring && detail && (
          <>
            <circle cx={50 - f.faceW - 0.4} cy={eyeY + 7.6} r={1.25} fill="hsl(43 60% 66%)" />
            <circle cx={50 + f.faceW + 0.4} cy={eyeY + 7.6} r={1.25} fill="hsl(43 60% 60%)" />
          </>
        )}

        {/* ── face ── */}
        <path d={face} fill={`url(#${uid}-skin)`} />

        {/* modelling: temple, cheek hollow and jaw shading, clipped to the face */}
        <g clipPath={`url(#${uid}-face)`}>
          <ellipse cx={50 + f.faceW * 0.62} cy={eyeY + 6} rx={7} ry={9} fill={f.skin[1]} opacity="0.4" />
          <ellipse cx={50 - f.faceW * 0.72} cy={eyeY + 5} rx={5} ry={7.5} fill={f.skin[2]} opacity="0.22" />
          <ellipse cx={50} cy={chinY - 5} rx={6.5} ry={4} fill={f.skin[2]} opacity="0.16" />
          {detail && (
            <>
              {/* forehead and nasolabial lines deepen with age */}
              <path
                d={`M ${50 - 8} ${eyeY - 11} Q 50 ${eyeY - 12.6} ${50 + 8} ${eyeY - 11}`}
                stroke={f.skin[1]}
                strokeWidth="0.6"
                fill="none"
                opacity={f.ageLines * 0.5}
              />
              <path
                d={`M ${50 - 6.2} ${noseY + 1.4} Q ${50 - 8.6} ${mouthY + 1.6} ${50 - 5.4} ${mouthY + 4}`}
                stroke={f.skin[1]}
                strokeWidth="0.75"
                fill="none"
                opacity={f.ageLines * 0.78}
              />
              <path
                d={`M ${50 + 6.2} ${noseY + 1.4} Q ${50 + 8.6} ${mouthY + 1.6} ${50 + 5.4} ${mouthY + 4}`}
                stroke={f.skin[1]}
                strokeWidth="0.75"
                fill="none"
                opacity={f.ageLines * 0.78}
              />
            </>
          )}
          {/* clammy sheen under pressure */}
          {dread > 0 && (
            <ellipse cx={50 - 4} cy={eyeY - 9} rx={9} ry={4} fill="#ffffff" opacity={dread * 0.14} />
          )}
        </g>

        {/* ── nose: shadow on the fill side, highlight on the key side ── */}
        <path
          d={`M ${50 - 0.7} ${eyeY + 1} C ${50 - 1.6} ${noseY - 2} ${50 - f.noseW} ${noseY - 0.6} ${50 - f.noseW * 0.82} ${noseY + 1.5}
              C ${50 - f.noseW * 0.4} ${noseY + 3.1} ${50 + f.noseW * 0.4} ${noseY + 3.1} ${50 + f.noseW * 0.82} ${noseY + 1.5}`}
          fill="none"
          stroke={f.skin[1]}
          strokeWidth="0.95"
          strokeLinecap="round"
          opacity="0.85"
        />
        {detail && (
          <path
            d={`M ${50 + 0.9} ${eyeY + 2} L ${50 + 1.3} ${noseY - 0.4}`}
            stroke={f.skin[2]}
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.5"
          />
        )}
        {/* nostrils flare with tension */}
        {detail && (
          <>
            <ellipse cx={50 - f.noseW * 0.55} cy={noseY + 1.9} rx={0.75 + e.tension * 0.3} ry={0.5} fill={f.skin[1]} opacity="0.8" />
            <ellipse cx={50 + f.noseW * 0.55} cy={noseY + 1.9} rx={0.75 + e.tension * 0.3} ry={0.5} fill={f.skin[1]} opacity="0.8" />
          </>
        )}

        {/* ── facial hair ──
            Drawn BEFORE the expression group so the lips render on top of it.
            Otherwise a beard occludes the mouth and the expression is lost. */}
        {f.beard === 1 && detail && (
          <path
            d={`M ${50 - f.faceW * f.jawTaper - 0.5} ${mouthY - 2} C ${50 - f.faceW * 0.5} ${chinY + 3} ${50 + f.faceW * 0.5} ${chinY + 3} ${50 + f.faceW * f.jawTaper + 0.5} ${mouthY - 2}
                C ${50 + f.faceW * 0.5} ${chinY - 1} ${50 - f.faceW * 0.5} ${chinY - 1} ${50 - f.faceW * f.jawTaper - 0.5} ${mouthY - 2} Z`}
            fill={f.hair[0]}
            opacity="0.3"
          />
        )}
        {f.beard === 2 && (
          <path
            d={`M ${50 - 4.2} ${mouthY - 3.7} Q 50 ${mouthY - 5.2} ${50 + 4.2} ${mouthY - 3.7} Q 50 ${mouthY - 2.5} ${50 - 4.2} ${mouthY - 3.7} Z`}
            fill={f.hair[0]}
          />
        )}
        {f.beard === 3 && (
          <>
            <path
              d={`M ${50 - f.faceW * f.jawTaper - 0.6} ${mouthY - 2.4} C ${50 - f.faceW * 0.5} ${chinY + 3.4} ${50 + f.faceW * 0.5} ${chinY + 3.4} ${50 + f.faceW * f.jawTaper + 0.6} ${mouthY - 2.4}
                  C ${50 + f.faceW * 0.5} ${mouthY + 1.4} ${50 - f.faceW * 0.5} ${mouthY + 1.4} ${50 - f.faceW * f.jawTaper - 0.6} ${mouthY - 2.4} Z`}
              fill={`url(#${uid}-hair)`}
            />
            <path
              d={`M ${50 - 4.4} ${mouthY - 3.8} Q 50 ${mouthY - 5.4} ${50 + 4.4} ${mouthY - 3.8} Q 50 ${mouthY - 2.6} ${50 - 4.4} ${mouthY - 3.8} Z`}
              fill={f.hair[0]}
            />
          </>
        )}

        {/* ══ EXPRESSION GROUP — crossfades whenever the mood changes ══ */}
        <AnimatePresence initial={false} mode="sync">
          <motion.g
            key={mood}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* ── eyes ── */}
            {[-1, 1].map((s) => {
              const cx = 50 + s * eyeX;
              const r = f.eyeSize;
              return (
                <g key={s}>
                  {/* socket shadow */}
                  <ellipse cx={cx} cy={eyeY} rx={r + 1.9} ry={r + 1.3} fill={f.skin[1]} opacity="0.34" />
                  {/* eye bags with age */}
                  {detail && f.ageLines > 0.25 && (
                    <path
                      d={`M ${cx - r} ${eyeY + r + 1.1} Q ${cx} ${eyeY + r + 2.5} ${cx + r} ${eyeY + r + 1.1}`}
                      stroke={f.skin[1]}
                      strokeWidth="0.55"
                      fill="none"
                      opacity={f.ageLines * 0.7}
                    />
                  )}
                  {/* sclera — deliberately not pure white; a bright white
                      sclera makes eyes look bulging, especially on deeper
                      skin tones, so this is a warm bone tone in shadow */}
                  <ellipse cx={cx} cy={eyeY} rx={r} ry={r * 0.74} fill="#ddd3c6" />
                  <ellipse cx={cx} cy={eyeY - r * 0.2} rx={r * 0.96} ry={r * 0.4} fill="#b9ab9c" opacity="0.5" />
                  {/* iris + pupil + catchlight */}
                  <circle cx={cx + e.pupilDx} cy={eyeY + e.pupilDy} r={r * 0.64} fill={f.eye} />
                  <circle cx={cx + e.pupilDx} cy={eyeY + e.pupilDy} r={r * 0.3} fill="#0d0a08" />
                  {detail && (
                    <circle
                      cx={cx + e.pupilDx - r * 0.24}
                      cy={eyeY + e.pupilDy - r * 0.28}
                      r={r * 0.17}
                      fill="#ffffff"
                      opacity="0.92"
                    />
                  )}
                  {/* upper lid, filled with skin so it occludes the eye */}
                  {lidCover > 0.05 && (
                    <path
                      d={`M ${cx - r - 0.4} ${eyeY - r * 0.78} L ${cx + r + 0.4} ${eyeY - r * 0.78}
                          L ${cx + r + 0.4} ${eyeY - r * 0.78 + lidCover} 
                          Q ${cx} ${eyeY - r * 0.78 + lidCover + 0.9} ${cx - r - 0.4} ${eyeY - r * 0.78 + lidCover} Z`}
                      fill={`url(#${uid}-skin)`}
                    />
                  )}
                  {/* lash line — the single strongest cue that an eye is an eye */}
                  <path
                    d={`M ${cx - r - 0.5} ${eyeY - r * 0.5 + lidCover} Q ${cx} ${eyeY - r * 0.95 + lidCover} ${cx + r + 0.5} ${eyeY - r * 0.5 + lidCover}`}
                    stroke="#241a14"
                    strokeWidth={fine ? 0.95 : 1.15}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* lower lid */}
                  {detail && (
                    <path
                      d={`M ${cx - r * 0.85} ${eyeY + r * 0.82} Q ${cx} ${eyeY + r * 1.05} ${cx + r * 0.85} ${eyeY + r * 0.82}`}
                      stroke={f.skin[1]}
                      strokeWidth="0.5"
                      fill="none"
                      opacity="0.9"
                    />
                  )}
                </g>
              );
            })}

            {/* ── brows ── */}
            {[-1, 1].map((s) => {
              const cx = 50 + s * eyeX;
              const by = eyeY - f.eyeSize - 3.5 + e.browY;
              const bw = f.eyeSize + 2.5;
              // tilt is mirrored so a glare converges toward the nose
              const inner = by + s * e.browTilt * 0.34 * -1;
              const outer = by - s * e.browTilt * 0.34 * -1;
              return (
                <path
                  key={s}
                  d={`M ${cx - bw * s} ${s < 0 ? inner : outer} Q ${cx} ${by - 1.5 * e.browArch} ${cx + bw * s} ${s < 0 ? outer : inner}`}
                  stroke={f.hair[0]}
                  strokeWidth={f.browThick}
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.94"
                />
              );
            })}

            {/* ── mouth ── */}
            <g>
              {mouth.interior && <path d={mouth.interior} fill="#3a1c1c" />}
              <path d={mouth.upper} fill="#8d4f4c" opacity={0.55 + f.lipFull * 0.16} />
              <path d={mouth.lower} fill="#a35e58" opacity={0.5 + f.lipFull * 0.18} />
              <path
                d={mouth.seam}
                stroke="#54262a"
                strokeWidth={0.9}
                fill="none"
                strokeLinecap="round"
              />
            </g>

            {/* ── perspiration, only when the pressure is real ── */}
            {e.sweat > 0 && detail && (
              <g fill="hsl(199 80% 82%)" opacity="0.72">
                <ellipse cx={50 - f.faceW * 0.68} cy={eyeY - 7} rx={0.95} ry={1.5} />
                {e.sweat > 1 && <ellipse cx={50 + f.faceW * 0.62} cy={eyeY - 4} rx={0.85} ry={1.35} />}
                {e.sweat > 1 && <ellipse cx={50 - f.faceW * 0.5} cy={eyeY + 9} rx={0.8} ry={1.25} />}
              </g>
            )}
          </motion.g>
        </AnimatePresence>

        {/* ── hair in front (drawn after the face so it overlaps the brow) ── */}
        <g fill={`url(#${uid}-hair)`}>
          <HairFront f={f} eyeY={eyeY} />
        </g>

        {/* ── spectacles ── */}
        {f.glasses && detail && (
          <g stroke="hsl(43 30% 62%)" strokeWidth="0.85" fill="none" opacity="0.9">
            <rect x={50 - eyeX - f.eyeSize - 2.2} y={eyeY - f.eyeSize - 1.6} width={(f.eyeSize + 2.2) * 2} height={(f.eyeSize + 1.6) * 2} rx={2.4} />
            <rect x={50 + eyeX - f.eyeSize - 2.2} y={eyeY - f.eyeSize - 1.6} width={(f.eyeSize + 2.2) * 2} height={(f.eyeSize + 1.6) * 2} rx={2.4} />
            <path d={`M ${50 - eyeX + f.eyeSize + 2.2} ${eyeY} L ${50 + eyeX - f.eyeSize - 2.2} ${eyeY}`} />
            <path d={`M ${50 - eyeX - f.eyeSize - 2.2} ${eyeY - 0.6} L ${50 - f.faceW - 1} ${eyeY - 1.6}`} />
            <path d={`M ${50 + eyeX + f.eyeSize + 2.2} ${eyeY - 0.6} L ${50 + f.faceW + 1} ${eyeY - 1.6}`} />
          </g>
        )}

        {/* ══ CINEMATIC LIGHTING PASS ══ */}
        {/* hard gold rim along the right silhouette — inside the figure group
            so it tracks the head, unlike the frame-level overlays below */}
          <g clipPath={`url(#${uid}-right)`}>
            <path d={face} fill="none" stroke="hsl(43 62% 72%)" strokeWidth="1.15" opacity="0.5" />
          </g>
        </g>
        {/* cool fill from the lower right */}
        <rect width="100" height="100" fill={`url(#${uid}-fill)`} />
        {/* stress wash */}
        {dread > 0 && <rect width="100" height="100" fill={`url(#${uid}-dread)`} opacity={dread} />}
        {/* corner vignette */}
        <rect width="100" height="100" fill={`url(#${uid}-vig)`} />
        {/* inner gilt hairline on the crop */}
        <circle cx="50" cy="50" r="49.4" fill="none" stroke="hsl(43 50% 70%)" strokeWidth="1" opacity="0.16" />
      </svg>
    </div>
  );
}

export default Avatar;
