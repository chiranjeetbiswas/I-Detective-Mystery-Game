"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

/** A person thinking is not a loading bar — three settling dots, no spinner. */
function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-gold/80 animate-dot-bob"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

/** A right-rail readout module. Same content as before, stronger hierarchy. */
function HudPanel({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-hairline bg-gradient-to-b from-surface-2/60 to-surface/45 p-3",
        "shadow-[0_4px_14px_-8px_hsl(222_60%_2%/0.8),inset_0_1px_0_0_hsl(210_40%_100%/0.05)]",
        className
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.13em] text-ink-subtle">
        <Icon className="h-3 w-3 text-gold/90" aria-hidden strokeWidth={2.4} />
        {label}
      </div>
      {children}
    </div>
  );
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-7 w-7 animate-spin text-gold" />
        <p className="text-micro uppercase tracking-[0.2em] text-ink-subtle">
          Opening the case file
        </p>
      </div>
    );
  }

  const { brief, state, characters, evidence, notebook } = snap;

  const quick = [
    "Look around",
    "Search the room",
    "Check if their stories match",
  ];

  const activeMood = activeChar ? moodMeta(activeChar.mood) : null;
  const ActiveMoodIcon = activeMood?.Icon;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ══ top bar ══ */}
      <header className="glass flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate font-display text-[1.0625rem] font-bold tracking-[0.03em] text-gilt">
            {brief.title}
          </span>
          <Badge variant="gold">{brief.difficulty}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={save}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => router.push(`/accuse/${id}`)}
          >
            <Gavel className="h-3.5 w-3.5" /> Final Guess
          </Button>
        </div>
      </header>

      {/*
        `grid-rows-[minmax(0,1fr)]` plus `min-h-0` on each column is what keeps
        this layout honest. Without them the implicit row sizes to its tallest
        child (a long suspect roster), the columns grow past the viewport and
        get centred in the row — which pushes the tab bar off the top and the
        message input off the bottom. The columns must be clamped to the row so
        their inner panels scroll instead.
      */}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[300px_1fr_260px]">
        {/* ══ LEFT: characters / evidence / notebook ══ */}
        <aside className="hidden min-h-0 flex-col border-r border-hairline bg-gradient-to-b from-surface/50 to-canvas/40 lg:flex">
          <div className="flex border-b border-hairline">
            {(["characters", "evidence", "notebook"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={cn(
                  "relative flex-1 py-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] transition-colors duration-200",
                  tab === t
                    ? "text-gold"
                    : "text-ink-subtle hover:text-ink"
                )}
              >
                {TAB_LABELS[t]}
                {tab === t && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-transparent via-gold to-transparent"
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
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
                evidence.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.34, delay: Math.min(i * 0.04, 0.3) }}
                    /* clues are photographs: hard edge, pale mount, drop shadow */
                    className="rounded-md border border-hairline-strong/50 bg-gradient-to-b from-surface-3/60 to-surface-2/50 p-3 shadow-[0_6px_18px_-10px_hsl(222_60%_2%/0.9),inset_0_1px_0_0_hsl(210_40%_100%/0.06)]"
                  >
                    <div className="font-display text-[0.875rem] font-semibold text-ink">
                      {e.name}
                    </div>
                    <div className="mt-1 text-ui leading-relaxed text-ink-muted">
                      {e.description}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-gold/85">
                      <MapPin className="h-2.5 w-2.5" aria-hidden strokeWidth={2.6} />
                      Found in {e.location}
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="px-1 text-ui italic leading-relaxed text-ink-subtle">
                  No clues yet. Try searching a room.
                </p>
              ))}

            {tab === "notebook" && <NotebookPanel notebook={notebook} />}
          </div>
        </aside>

        {/* ══ CENTER: conversation ══ */}
        <section className="relative flex min-h-0 flex-col overflow-hidden">
          {/* active character header */}
          {activeChar && (
            <div className="glass flex items-center gap-3 border-b px-5 py-3">
              <Avatar
                seed={activeChar.avatar_seed || activeChar.id}
                gender={activeChar.gender}
                age={activeChar.age}
                occupation={activeChar.occupation}
                mood={busy ? "thinking" : activeChar.mood}
                stress={activeChar.stress}
                name={activeChar.name}
                size="md"
                ring={moodMeta(activeChar.mood).color}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[0.5625rem] font-bold uppercase tracking-[0.18em] text-ink-subtle/80">
                  Currently Talking To
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-display text-[1.0625rem] font-bold text-gilt">
                    {activeChar.name}
                  </span>
                  <span className="shrink-0 text-micro text-ink-subtle">
                    {activeChar.age} · {activeChar.occupation}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.625rem]">
                  <span
                    className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.08em]"
                    style={{ color: moodMeta(activeChar.mood).color }}
                  >
                    {ActiveMoodIcon && (
                      <ActiveMoodIcon className="h-2.5 w-2.5" aria-hidden strokeWidth={2.4} />
                    )}
                    {moodMeta(activeChar.mood).label}
                  </span>
                  {activeChar.speaking_style && (
                    <span className="text-ink-subtle/85">
                      · &ldquo;{activeChar.speaking_style}&rdquo;
                    </span>
                  )}
                  {activeChar.habits && (
                    <span className="text-ink-subtle/85">· {activeChar.habits}</span>
                  )}
                </div>
              </div>
              <ArrowLeftRight
                className="h-4 w-4 shrink-0 text-ink-subtle/60"
                aria-hidden
              />
            </div>
          )}

          {!activeChar && (
            <div className="glass border-b px-5 py-3 text-center">
              <p className="text-ui leading-relaxed text-ink-muted">
                Click a guest on the left to start talking. Every message you send
                will go to the person you pick.
              </p>
            </div>
          )}

          {/* transcript */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-7">
            <Transcript lines={transcript} characters={characters} />
            {busy && (
              <div className="mt-5 flex items-center gap-2.5 pl-1">
                <ThinkingDots />
                <span className="text-micro italic text-ink-subtle">
                  {activeChar ? `${activeChar.name} is thinking` : "Working"}
                </span>
              </div>
            )}
          </div>

          {/* input */}
          <div className="glass border-t p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quick.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={busy}
                  className={cn(
                    "rounded-full border border-hairline bg-surface-2/50 px-3 py-1",
                    "text-[0.6875rem] font-medium text-ink-muted",
                    "transition-all duration-200 ease-cine",
                    "hover:-translate-y-[1px] hover:border-gold/45 hover:bg-surface-3/70 hover:text-gold",
                    "disabled:pointer-events-none disabled:opacity-45"
                  )}
                >
                  {q}
                </button>
              ))}
              <button
                onClick={hint}
                disabled={busy}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/[0.08] px-3 py-1",
                  "text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-gold",
                  "transition-all duration-200 ease-cine",
                  "hover:-translate-y-[1px] hover:bg-gold/[0.16]",
                  "disabled:pointer-events-none disabled:opacity-45"
                )}
              >
                <Lightbulb className="h-3 w-3" aria-hidden strokeWidth={2.4} /> Hint
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
              <Button type="submit" disabled={busy || !input.trim()} aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </section>

        {/* ══ RIGHT: clock, location, objective, inventory, progress ══ */}
        <aside className="hidden min-h-0 flex-col gap-2.5 overflow-y-auto border-l border-hairline bg-gradient-to-b from-surface/50 to-canvas/40 p-3 lg:flex">
          {/* the clock is the hero of this rail: every action spends it */}
          <div className="relative overflow-hidden rounded-lg border border-gold/25 bg-gradient-to-b from-gold/[0.09] to-surface/50 p-3 text-center shadow-[0_6px_20px_-10px_hsl(43_60%_30%/0.55),inset_0_1px_0_0_hsl(45_80%_80%/0.12)]">
            <Clock className="mx-auto mb-1 h-4 w-4 text-gold/90" aria-hidden strokeWidth={2.2} />
            <div className="type-num text-[1.625rem] font-bold leading-none text-gilt">
              {state.clock}
            </div>
            <div className="mt-1.5 text-[0.5625rem] font-bold uppercase tracking-[0.16em] text-ink-subtle">
              {state.minutes_elapsed} minutes gone
            </div>
          </div>

          <HudPanel icon={MapPin} label="Where you are">
            <div className="text-ui font-medium text-ink">
              {state.current_location || brief.location_name}
            </div>
          </HudPanel>

          <HudPanel icon={Target} label="Your job">
            <div className="text-ui leading-relaxed text-ink-muted">
              {state.current_objective}
            </div>
          </HudPanel>

          <HudPanel icon={Package} label="What you carry">
            {state.inventory.length ? (
              <ul className="space-y-0.5 text-ui text-ink-muted">
                {state.inventory.map((i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-gold/70">·</span>
                    {i}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-ui italic text-ink-subtle">Nothing</div>
            )}
          </HudPanel>

          <HudPanel icon={BookOpen} label="How you are doing">
            <div className="flex items-baseline gap-4">
              <div>
                <div className="type-num text-[1.125rem] font-bold text-ink">
                  {state.discovered_evidence_count}
                </div>
                <div className="text-[0.5625rem] uppercase tracking-[0.12em] text-ink-subtle">
                  clues
                </div>
              </div>
              <div>
                <div className="type-num text-[1.125rem] font-bold text-ink">
                  {state.hints_used}
                </div>
                <div className="text-[0.5625rem] uppercase tracking-[0.12em] text-ink-subtle">
                  hints
                </div>
              </div>
            </div>
          </HudPanel>
        </aside>
      </div>
    </div>
  );
}
