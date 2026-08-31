"use client";

import { Meter } from "@/components/ui/meter";
import { Avatar } from "@/components/game/avatar";
import { cn } from "@/lib/utils";
import { moodMeta, statusMeta } from "@/lib/mood";
import type { CharacterView } from "@/lib/types";

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

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full rounded-md border p-3 text-left transition-colors",
        isActive
          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
          : "border-border hover:bg-secondary"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Avatar
          seed={c.avatar_seed || c.id}
          gender={c.gender}
          size="md"
          ring={isActive ? "#fbbf24" : mood.color}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{c.name}</span>
            {isActive && (
              <span className="shrink-0 rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                Talking
              </span>
            )}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {c.age} · {c.occupation}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px]">
            <span style={{ color: mood.color }}>
              {mood.emoji} {mood.label}
            </span>
            <span style={{ color: status.color }}>· {status.label}</span>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Meter label="Trust" value={c.trust} tone="trust" />
        <Meter label="Stress" value={c.stress} tone="stress" />
        {c.suspicion_of_player > 0 && (
          <Meter label="Suspects you" value={c.suspicion_of_player} tone="suspicion" />
        )}
      </div>
    </button>
  );
}
