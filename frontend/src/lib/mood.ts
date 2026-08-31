import type { Mood, NPCStatus } from "@/lib/types";

export const MOOD_META: Record<Mood, { label: string; color: string; emoji: string }> = {
  calm: { label: "Calm", color: "#7dd3fc", emoji: "🙂" },
  happy: { label: "Happy", color: "#86efac", emoji: "😊" },
  confident: { label: "Confident", color: "#fcd34d", emoji: "😎" },
  suspicious: { label: "Suspicious", color: "#c4b5fd", emoji: "🤨" },
  nervous: { label: "Nervous", color: "#fca5a5", emoji: "😰" },
  scared: { label: "Scared", color: "#f87171", emoji: "😨" },
  angry: { label: "Angry", color: "#ef4444", emoji: "😠" },
};

export const STATUS_META: Record<NPCStatus, { label: string; color: string }> = {
  available: { label: "Available", color: "#9ca3af" },
  talking: { label: "Talking", color: "#fcd34d" },
  busy: { label: "Busy", color: "#f59e0b" },
  sleeping: { label: "Sleeping", color: "#6366f1" },
  missing: { label: "Missing", color: "#ef4444" },
};

export function moodMeta(mood: Mood) {
  return MOOD_META[mood] ?? MOOD_META.calm;
}

export function statusMeta(status: NPCStatus) {
  return STATUS_META[status] ?? STATUS_META.available;
}
