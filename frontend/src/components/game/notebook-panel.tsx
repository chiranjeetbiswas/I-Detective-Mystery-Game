"use client";

import type { Notebook } from "@/lib/types";

function Section({
  title,
  entries,
}: {
  title: string;
  entries: { title: string; detail?: string; at_time?: string }[];
}) {
  if (!entries.length) return null;
  return (
    <div className="mb-4">
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {entries.map((e, i) => (
          <li key={i} className="rounded-md border border-border bg-secondary/30 p-2 text-xs">
            <div className="flex justify-between gap-2">
              <span className="font-medium text-foreground">{e.title}</span>
              {e.at_time && (
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {e.at_time}
                </span>
              )}
            </div>
            {e.detail && <p className="mt-0.5 text-muted-foreground">{e.detail}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NotebookPanel({ notebook }: { notebook: Notebook }) {
  const empty =
    !notebook.characters.length &&
    !notebook.evidence.length &&
    !notebook.secrets.length &&
    !notebook.contradictions.length;

  return (
    <div>
      {empty && (
        <p className="text-xs text-muted-foreground">
          Your notes fill up by themselves while you play.
        </p>
      )}
      <Section title="Guests" entries={notebook.characters} />
      <Section title="Clues" entries={notebook.evidence} />
      <Section title="Things That Do Not Match" entries={notebook.contradictions} />
      <Section title="Secrets You Learned" entries={notebook.secrets} />
      <Section title="What Happened, and When" entries={notebook.timeline} />
      <Section title="Still To Find Out" entries={notebook.open_questions} />
    </div>
  );
}
