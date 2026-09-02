import {
  Activity,
  AlertTriangle,
  Crown,
  Eye,
  Flame,
  Laugh,
  MessageSquare,
  Moon,
  Smile,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";

import type { Mood, NPCStatus } from "@/lib/types";

/**
 * Mood and status presentation.
 *
 * Two deliberate choices here:
 *
 * 1. Lucide icons replace emoji. Emoji render inconsistently across platforms,
 *    look unfinished next to a typographic interface, and screen readers
 *    announce them with unhelpful names ("grinning face with smiling eyes").
 *
 * 2. Every entry carries a `label`. Colour and icon are always accompanied by
 *    the word, so mood is never conveyed by colour alone — which keeps the
 *    information available to colour-blind players.
 *
 * Colours are tuned for legibility on the navy surfaces rather than for
 * maximum saturation.
 */

export interface MoodMeta {
  label: string;
  /** Text/icon colour — verified ≥ 4.5:1 against `--surface`. */
  color: string;
  /** Faint tint for chip backgrounds. */
  tint: string;
  Icon: LucideIcon;
}

export const MOOD_META: Record<Mood, MoodMeta> = {
  calm: {
    label: "Calm",
    color: "hsl(199 62% 72%)",
    tint: "hsl(199 62% 60% / 0.14)",
    Icon: Smile,
  },
  happy: {
    label: "Happy",
    color: "hsl(152 48% 66%)",
    tint: "hsl(152 48% 55% / 0.14)",
    Icon: Laugh,
  },
  confident: {
    label: "Confident",
    color: "hsl(43 66% 68%)",
    tint: "hsl(43 66% 58% / 0.15)",
    Icon: Crown,
  },
  suspicious: {
    label: "Suspicious",
    color: "hsl(268 58% 78%)",
    tint: "hsl(268 58% 68% / 0.16)",
    Icon: Eye,
  },
  nervous: {
    label: "Nervous",
    color: "hsl(36 82% 68%)",
    tint: "hsl(36 82% 58% / 0.15)",
    Icon: Activity,
  },
  scared: {
    label: "Afraid",
    color: "hsl(14 80% 70%)",
    tint: "hsl(14 80% 60% / 0.16)",
    Icon: AlertTriangle,
  },
  angry: {
    label: "Angry",
    color: "hsl(356 76% 70%)",
    tint: "hsl(356 76% 60% / 0.16)",
    Icon: Flame,
  },
};

export interface StatusMeta {
  label: string;
  color: string;
  Icon: LucideIcon;
}

export const STATUS_META: Record<NPCStatus, StatusMeta> = {
  available: { label: "Available", color: "hsl(214 17% 74%)", Icon: UserCheck },
  talking: { label: "Talking", color: "hsl(43 66% 68%)", Icon: MessageSquare },
  busy: { label: "Busy", color: "hsl(36 78% 66%)", Icon: Activity },
  sleeping: { label: "Resting", color: "hsl(240 40% 76%)", Icon: Moon },
  missing: { label: "Missing", color: "hsl(356 76% 70%)", Icon: UserX },
};

export function moodMeta(mood: Mood): MoodMeta {
  return MOOD_META[mood] ?? MOOD_META.calm;
}

export function statusMeta(status: NPCStatus): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.available;
}

// ---- AI detective team status presentation ----
import type { DetectiveStatus } from "@/lib/types";
import { Ear, Brain, Search, Undo2, FileText, Pause } from "lucide-react";

export const DETECTIVE_STATUS_META: Record<DetectiveStatus, StatusMeta> = {
  idle: { label: "Idle", color: "hsl(214 15% 62%)", Icon: Pause },
  listening: { label: "Listening", color: "hsl(199 62% 72%)", Icon: Ear },
  analyzing: { label: "Analyzing", color: "hsl(268 58% 78%)", Icon: Brain },
  investigating: { label: "Investigating", color: "hsl(43 66% 68%)", Icon: Search },
  returning: { label: "Returning", color: "hsl(152 48% 66%)", Icon: Undo2 },
  writing_report: { label: "Writing Report", color: "hsl(36 82% 68%)", Icon: FileText },
};

export function detectiveStatusMeta(status: DetectiveStatus): StatusMeta {
  return DETECTIVE_STATUS_META[status] ?? DETECTIVE_STATUS_META.idle;
}
