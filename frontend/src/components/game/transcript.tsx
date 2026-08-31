"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/game/avatar";
import type { CharacterView, TranscriptLine } from "@/lib/types";

export function Transcript({
  lines,
  characters = [],
}: {
  lines: TranscriptLine[];
  characters?: CharacterView[];
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  const byId = new Map(characters.map((c) => [c.id, c]));
  const byName = new Map(characters.map((c) => [c.name, c]));

  return (
    <div className="space-y-4">
      {lines.map((l, i) => {
        if (l.kind === "narration") {
          return (
            <p
              key={i}
              className="animate-fade-in italic leading-relaxed text-muted-foreground"
            >
              {l.text}
            </p>
          );
        }
        if (l.kind === "system") {
          return (
            <div
              key={i}
              className="animate-fade-in rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary"
            >
              💡 {l.text}
            </div>
          );
        }
        const isYou = l.speaker === "You";
        const char =
          (l.character_id && byId.get(l.character_id)) ||
          byName.get(l.speaker) ||
          undefined;

        return (
          <div
            key={i}
            className={cn(
              "animate-fade-in flex gap-2",
              isYou ? "flex-row-reverse" : "flex-row"
            )}
          >
            {!isYou && char && (
              <Avatar
                seed={char.avatar_seed || char.id}
                gender={char.gender}
                size="sm"
                className="mt-5"
              />
            )}
            <div className={cn("flex flex-col", isYou && "items-end")}>
              <div className="mb-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span
                  className={cn(
                    "font-semibold",
                    isYou ? "text-primary" : "text-foreground"
                  )}
                >
                  {l.speaker}
                </span>
                <span>{l.at_time}</span>
              </div>
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  isYou
                    ? "bg-primary/15 text-foreground"
                    : "border border-border bg-secondary/50"
                )}
              >
                {l.text}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
