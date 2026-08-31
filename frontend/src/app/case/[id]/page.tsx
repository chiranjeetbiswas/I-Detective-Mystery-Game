"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  MapPin,
  Target,
  Lightbulb,
  Save,
  Send,
  Loader2,
  Package,
  BookOpen,
  Gavel,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CharacterCard } from "@/components/game/character-card";
import { NotebookPanel } from "@/components/game/notebook-panel";
import { Transcript } from "@/components/game/transcript";
import { Avatar } from "@/components/game/avatar";
import { cn } from "@/lib/utils";
import { moodMeta } from "@/lib/mood";
import { api } from "@/lib/api";
import { setActiveGame } from "@/lib/session";
import type { CharacterView, Snapshot, TranscriptLine } from "@/lib/types";

type Tab = "characters" | "evidence" | "notebook";

const TAB_LABELS: Record<Tab, string> = {
  characters: "guests",
  evidence: "clues",
  notebook: "notes",
};

/** The non-talking actions that should route via the generic `/action` endpoint. */
const NON_TALK_PREFIXES = [
  "search",
  "inspect",
  "examine",
  "look around",
  "go to",
  "move to",
  "walk to",
  "enter",
  "head to",
  "visit",
  "look in",
  "look inside",
  "open",
  "rummage",
  "check",
  "think",
  "consider",
  "wait",
  "hint",
  "give me a hint",
  "help me",
  "stuck",
];

function isNonTalkAction(text: string): boolean {
  const low = text.toLowerCase().trim();
  return NON_TALK_PREFIXES.some((p) => low.startsWith(p));
}

export default function InvestigationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [tab, setTab] = useState<Tab>("characters");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // derived active character view from the latest characters array
  const activeCharId = snap?.state.active_character_id ?? "";
  const activeChar: CharacterView | undefined = snap?.characters.find(
    (c) => c.id === activeCharId
  );

  useEffect(() => {
    setActiveGame(id);
    api
      .getGame(id)
      .then((s) => {
        setSnap(s);
        setTranscript(s.transcript);
        if (s.state.status !== "in_progress") router.replace(`/result/${id}`);
      })
      .catch(() => setSnap(null));
  }, [id, router]);

  /** Apply an ActionResponse to local state. */
  function applyResponse(res: {
    state: Snapshot["state"];
    characters: Snapshot["characters"];
    evidence: Snapshot["evidence"];
    notebook: Snapshot["notebook"];
    transcript: TranscriptLine[];
  }) {
    setTranscript(res.transcript);
    setSnap((prev) =>
      prev
        ? {
            ...prev,
            state: res.state,
            characters: res.characters,
            evidence: res.evidence,
            notebook: res.notebook,
          }
        : prev
    );
    if (res.state.status !== "in_progress") router.replace(`/result/${id}`);
  }

  /** Select a character as the active conversation target. */
  async function selectCharacter(cid: string) {
    if (busy || cid === activeCharId) return;
    setBusy(true);
    try {
      const res = await api.selectCharacter(id, cid);
      applyResponse(res);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  /** Send a message. If an active character is set and the text looks like
   *  conversation, use the /talk endpoint. Otherwise fall back to /action. */
  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setInput("");
    try {
      let res;
      if (activeCharId && !isNonTalkAction(text)) {
        res = await api.talk(id, text);
      } else {
        res = await api.action(id, text);
      }
      applyResponse(res);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function hint() {
    if (busy) return;
    setBusy(true);
    try {
      await api.hint(id);
      const s = await api.getGame(id);
      setTranscript(s.transcript);
      setSnap(s);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const slot = prompt("Name this saved game:", "autosave");
    if (!slot) return;
    await api.save(id, slot);
    alert(`Saved as "${slot}".`);
  }

  if (!snap) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { brief, state, characters, evidence, notebook } = snap;

  const quick = [
    "Look around",
    "Search the room",
    "Check if their stories match",
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* top bar */}
      <header className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="font-serif text-lg font-bold">{brief.title}</span>
          <Badge variant="gold">{brief.difficulty}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={save}>
            <Save className="h-4 w-4" /> Save
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => router.push(`/accuse/${id}`)}
          >
            <Gavel className="h-4 w-4" /> Final Guess
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[300px_1fr_260px]">
        {/* LEFT sidebar: characters / evidence / notebook */}
        <aside className="hidden flex-col border-r border-border bg-card/40 lg:flex">
          <div className="flex border-b border-border">
            {(["characters", "evidence", "notebook"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2.5 text-xs font-medium capitalize transition-colors",
                  tab === t
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {tab === "characters" &&
              characters.map((c) => (
                <CharacterCard
                  key={c.id}
                  c={c}
                  active={c.id === activeCharId}
                  onSelect={() => selectCharacter(c.id)}
                />
              ))}
            {tab === "evidence" &&
              (evidence.length ? (
                evidence.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-md border border-border bg-secondary/30 p-3"
                  >
                    <div className="text-sm font-semibold">{e.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.description}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-primary">
                      Found in {e.location}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  No clues yet. Try searching a room.
                </p>
              ))}
            {tab === "notebook" && <NotebookPanel notebook={notebook} />}
          </div>
        </aside>

        {/* CENTER: conversation area */}
        <section className="flex flex-col overflow-hidden">
          {/* active character header */}
          {activeChar && (
            <div className="flex items-center gap-3 border-b border-border bg-card/60 px-5 py-3 backdrop-blur">
              <Avatar
                seed={activeChar.avatar_seed || activeChar.id}
                gender={activeChar.gender}
                size="sm"
                ring={moodMeta(activeChar.mood).color}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Currently Talking To
                </div>
                <div className="flex items-center gap-2">
                  <span className="truncate font-serif text-base font-bold text-primary">
                    {activeChar.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {activeChar.age} · {activeChar.occupation}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span style={{ color: moodMeta(activeChar.mood).color }}>
                    {moodMeta(activeChar.mood).emoji} {moodMeta(activeChar.mood).label}
                  </span>
                  {activeChar.speaking_style && (
                    <span>· "{activeChar.speaking_style}"</span>
                  )}
                  {activeChar.habits && (
                    <span>· {activeChar.habits}</span>
                  )}
                </div>
              </div>
              <ArrowLeftRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          )}

          {!activeChar && (
            <div className="border-b border-border bg-card/60 px-5 py-3 text-center backdrop-blur">
              <p className="text-xs text-muted-foreground">
                Click a guest on the left to start talking. Every message you send
                will go to the person you pick.
              </p>
            </div>
          )}

          {/* transcript */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <Transcript lines={transcript} />
            {busy && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> …
              </div>
            )}
          </div>

          {/* input */}
          <div className="border-t border-border bg-card/60 p-3 backdrop-blur">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quick.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={busy}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-secondary disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
              <button
                onClick={hint}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-2.5 py-1 text-[11px] text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                <Lightbulb className="h-3 w-3" /> Hint
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  activeChar
                    ? `Say something to ${activeChar.name}…`
                    : "Pick a guest first, or search a room…"
                }
                disabled={busy}
                autoFocus
              />
              <Button type="submit" disabled={busy || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </section>

        {/* RIGHT sidebar: clock, location, inventory, objective */}
        <aside className="hidden flex-col gap-3 border-l border-border bg-card/40 p-3 lg:flex">
          <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
            <Clock className="mx-auto mb-1 h-5 w-5 text-primary" />
            <div className="font-mono text-2xl font-bold">{state.clock}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {state.minutes_elapsed} minutes gone
            </div>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Where you are
            </div>
            <div className="text-sm">{state.current_location || brief.location_name}</div>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-primary" /> Your job
            </div>
            <div className="text-xs text-foreground/90">{state.current_objective}</div>
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Package className="h-3.5 w-3.5 text-primary" /> What you carry
            </div>
            {state.inventory.length ? (
              <ul className="text-xs">
                {state.inventory.map((i) => (
                  <li key={i}>· {i}</li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground">Nothing</div>
            )}
          </div>
          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> How you are doing
            </div>
            <div className="text-xs text-muted-foreground">
              {state.discovered_evidence_count} clues found · {state.hints_used} hints used
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
