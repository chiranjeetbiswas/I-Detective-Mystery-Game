# Identity Hunt — Design System

A cinematic detective-noir visual system: layered navy/slate surfaces lit by
antique gold. This document describes the tokens, scales and component styles as
actually implemented, not as aspiration.

**Source of truth:** `src/app/globals.css` (tokens) and `tailwind.config.ts`
(theme mapping). Change colour in the CSS file; Tailwind reads from it.

---

## 1. Colour

All colours are stored as **bare HSL triplets** in CSS custom properties so
Tailwind can compose them with opacity modifiers:

```css
--gold: 43 52% 60%;        /* stored bare */
```
```tsx
className="bg-gold/15 text-gold"   /* → hsl(var(--gold) / 0.15) */
```

### Surfaces — five stacked planes

Each step up in elevation gets lighter and slightly less saturated. That
gradient of lightness is what reads as light falling from above.

| Token | HSL | Tailwind | Use |
|---|---|---|---|
| `--bg` | `222 47% 4%` | `bg-canvas` | Deepest canvas |
| `--bg-elevated` | `221 40% 6%` | `bg-elevated` | App chrome wash |
| `--surface` | `221 33% 9%` | `bg-surface` | Cards, panels |
| `--surface-2` | `220 26% 13%` | `bg-surface-2` | Raised rows, secondary fills |
| `--surface-3` | `219 21% 18%` | `bg-surface-3` | Inputs, hover states |
| `--border` | `217 18% 22%` | `border-hairline` | Hairlines |
| `--border-strong` | `215 16% 34%` | `border-hairline-strong` | Emphasised dividers |

### Ink

Cool off-white, so text sits in the same light as the navy surfaces.

| Token | HSL | Tailwind | Use |
|---|---|---|---|
| `--fg` | `210 30% 95%` | `text-ink` | Primary text |
| `--fg-muted` | `214 17% 74%` | `text-ink-muted` | Secondary text |
| `--fg-subtle` | `215 14% 60%` | `text-ink-subtle` | Micro labels, timestamps |

### Antique gold

Deliberately desaturated versus the previous neon amber. This is tarnished brass
and gilt-edged paper, not a warning light.

| Token | HSL | Tailwind | Use |
|---|---|---|---|
| `--gold` | `43 52% 60%` | `text-gold` | Primary accent |
| `--gold-bright` | `45 76% 74%` | `text-gold-bright` | Emphasis, highlight stop |
| `--gold-deep` | `38 42% 36%` | `text-gold-deep` | Gradient shadow stop |

### Semantic accents

| Token | HSL | Tailwind | Meaning |
|---|---|---|---|
| `--trust` | `168 46% 47%` | `text-trust` | Trust meter (verdigris) |
| `--stress` | `30 78% 57%` | `text-stress` | Stress meter (ember) |
| `--suspicion` | `268 46% 68%` | `text-suspicion` | Suspicion meter (cold violet) |
| `--danger` | `356 64% 55%` | `text-danger` | Irreversible actions |
| `--info` | `199 60% 62%` | `text-info` | Neutral information |

### Colour discipline

- **Gold means "your attention is here."** Active suspect, focus rings, primary
  action, the clock. Spending it elsewhere devalues it.
- **Crimson is reserved for the irreversible.** The accusation screen is the
  only place it is a primary key.
- **Warm tones mean paper.** The notebook is the only warm surface in the app.
  That material contrast is intentional.

### Verified contrast (WCAG 2.1)

All 24 audited pairings pass AA; most exceed AAA (7:1). Measured, not estimated:

| Pairing | Ratio | Min | Result |
|---|---|---|---|
| ink on canvas | 17.82:1 | 4.5 | PASS |
| ink on surface | 16.39:1 | 4.5 | PASS |
| ink-muted on surface | 9.49:1 | 4.5 | PASS |
| ink-subtle on surface | 6.18:1 | 3.0 | PASS |
| gold on surface | 8.78:1 | 4.5 | PASS |
| gold-bright on surface | 12.83:1 | 4.5 | PASS |
| button label on gold | 9.30:1 | 4.5 | PASS |
| mood chips (all 7) | 6.66–10.96:1 | 4.5 | PASS |
| meter value labels | 9.54–11.27:1 | 4.5 | PASS |

Lowest ratio in the system is `mood angry` at 6.66:1 — still above AAA for
normal text. Re-run the audit after any palette change.

---

## 2. Typography

Four families, each with one job. The previous system used a single serif for
everything, which is what made it read as a template.

| Role | Family | CSS var | Tailwind | Used for |
|---|---|---|---|---|
| Display | **Cinzel** | `--font-display` | `font-display` | Titles, names, verdicts |
| Prose | **Cormorant Garamond** | `--font-prose` | `font-prose` | Dialogue, narration |
| UI | **Inter** | `--font-sans` | `font-sans` | All interface furniture |
| Numeric | **JetBrains Mono** | `--font-mono` | `font-mono` | Clock, counters, stats |

Loaded via `next/font/google` in `src/app/layout.tsx` with `display: "swap"`
and self-hosted at build time — no runtime request to Google.

### Scale

Utility classes in `globals.css`. Cinzel is all-caps by design, so tracking
opens up as size increases; Cormorant runs optically small, so dialogue is set
larger than the UI text around it.

| Class | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `.type-display-xl` | `clamp(2.25rem, 5vw, 3.5rem)` | 700 | `.03em` | Landing title |
| `.type-display-lg` | `clamp(1.75rem, 3.4vw, 2.5rem)` | 700 | `.025em` | Screen titles |
| `.type-display-md` | `1.5rem` | 600 | `.02em` | Section heads |
| `.type-display-sm` | `1.125rem` | 600 | `.03em` | Card titles |
| `.type-dialogue` | `1.0625rem` | 500 | `.005em` | Spoken lines |
| `.type-narration` | `1.0625rem` | 400 italic | — | Narrator prose |
| `.type-label` | `0.75rem` | 600 | `.1em` | Uppercase labels |
| `.type-micro` | `0.6875rem` | 500 | `.06em` | Timestamps only |
| `.type-num` | inherits | 500 | tabular | Any figure |

**Minimum sizes.** 12px is the floor for UI text; 11px (`.type-micro`) is
permitted only for timestamps and counts. The previous design used 10px widely,
which is below a comfortable reading threshold.

### Special treatment

`.text-gilt` applies a three-stop gold gradient clipped to the glyphs. Use on
titles only — it costs legibility at small sizes and stops being special if
applied everywhere.

---

## 3. Spacing & radius

4px base grid. Card padding `p-3` (12px) in dense panels, `p-5` (20px) in
feature cards. Panel gaps `gap-2.5`/`gap-3`.

| Radius | Value | Use |
|---|---|---|
| `rounded-sm` | `calc(var(--radius) - 4px)` | Chips, small buttons |
| `rounded-md` | `calc(var(--radius) - 2px)` | Buttons, inputs |
| `rounded-lg` | `var(--radius)` = `0.625rem` | Dossier cards, panels |
| `rounded-xl` | `+4px` | Feature cards, bubbles |
| `rounded-2xl` | `+10px` | Hero surfaces |

---

## 4. Elevation

Dark UIs need three cues together, or a raised panel reads as a hole:

1. a top-to-bottom gradient (light from above),
2. a 1px inner highlight on the top edge (`--bevel`),
3. a layered shadow beneath.

| Token | Tailwind | Use |
|---|---|---|
| `--shadow-sm` | `shadow-sm` | Inline chips |
| `--shadow-md` | `shadow-md` | Resting cards |
| `--shadow-lg` | `shadow-lg` | Raised/active cards |
| `--shadow-xl` | `shadow-xl` | Modals, hero |
| `--glow-gold` | `shadow-gold` | Active suspect, focus |

### Surface utilities

| Class | Material |
|---|---|
| `.glass` | Frosted chrome — headers, floating bars |
| `.surface-card` | Standard card: gradient + hairline + bevel + shadow |
| `.surface-card-gold` | Selected state, one step brighter |
| `.surface-paper` | Aged paper — notebook only |
| `.rule-gold` | Hairline that fades at both ends |
| `.eyebrow` | Small-caps heading with a gold tick |

---

## 5. Components

### Button (`ui/button.tsx`)

Physical objects: gradient fill, top bevel, shadow that deepens on hover
(`-translate-y-[1px]`) and collapses on press (`active:translate-y-[1px]`).

Variants: `default`/`gold` (gilt primary), `destructive`/`danger` (crimson),
`outline` (engraved secondary), `secondary`, `ghost` (chrome).
Sizes: `sm` `md`/`default` `lg` `xl` `icon`.

### Card (`ui/card.tsx`)

`Card` for standard panels, `CardGilt` for feature panels — the latter adds a
gold hairline across the top edge via `::before`.

### Meter (`ui/meter.tsx`)

A stat readout, not a progress bar. Engraved track, gradient fill with a glow at
the leading edge, spring-animated so a value change is *seen* falling or rising.
Carries `role="meter"` with full ARIA value attributes.

### Suspect dossier (`game/character-card.tsx`)

Hierarchy: portrait → name (display serif) → role (quiet sans) → mood chip
(icon + word + colour) → engraved meters. Active file gets a gilt spine
(`layoutId` so it slides between cards). Stress above 55 adds an inset red
vignette scaling with the value.

### Transcript (`game/transcript.tsx`)

Four materials so line kinds sort without reading: raised slate bubble for NPC
speech, gilt-tinted bubble for the player, bubble-less italic serif framed by
gold rules for narration, gilt card for hints. Container is `role="log"` +
`aria-live="polite"`.

### Notebook (`game/notebook-panel.tsx`)

The only warm surface. Six sections, each with its own Lucide icon and accent;
contradictions are tinted crimson because they are what break a case open.

### Mood & status (`lib/mood.ts`)

Lucide icons replaced emoji — emoji render inconsistently, look unfinished, and
screen readers announce them unhelpfully. **Every entry carries a text label**,
so mood is never conveyed by colour alone.

---

## 6. Portraits (`game/avatar.tsx`)

Procedural inline SVG. No network requests, no image assets, and no two
characters alike.

Every trait derives deterministically from the character seed via FNV-1a →
mulberry32, so a character is pixel-identical across renders and reloads while
the cast looks varied: face geometry, skin tone (8), hair colour (9 + 3 greys),
hair style (11), eye colour (7), garment (8), facial hair, spectacles, earrings.

`age` drives greying, eye bags and nasolabial folds. `occupation` selects
profession-appropriate clothing (uniform with epaulettes for crew, waistcoat for
service, turtleneck for curators, gown for performers).

**Lighting** is a three-point noir setup — warm key upper-left, cool slate fill
lower-right, hard gold rim clipped to the right silhouette edge — plus a corner
vignette. This is what makes them read as illustration rather than clip art.

**Expressions** come from a parameter table (`EXPR`), not hand-drawn faces, so
all eight states work on every face: brow height/tilt/arch, lid aperture, gaze
offset, mouth curvature and openness, asymmetry, tension, perspiration. Mood
changes crossfade via `AnimatePresence`.

### Rules when editing

- **Unique gradient IDs.** Every gradient/clip id is namespaced with
  `useId()`. Without this, multiple portraits on one page collide and share
  whichever def rendered last.
- **Draw order matters.** Facial hair renders *before* the expression group so
  lips stay visible; hair-front renders *after* the face so it overlaps the brow.
- **Detail degrades by size.** `detail` (≥52px) and `fine` (≥84px) flags drop
  age lines, catchlights and spectacles at small sizes to keep 40px legible.
- **The hairline is load-bearing.** It sits at `eyeY - 13.6`. Move it lower and
  the portrait immediately reads as a swim cap.

Sizes: `xs` 30 · `sm` 40 · `md` 56 · `lg` 96 · `xl` 132.

---

## 7. Animation

`MotionProvider` wraps the app with `reducedMotion="user"`, and `globals.css`
carries a matching `prefers-reduced-motion` block. Both layers are required —
one covers Framer Motion, the other covers CSS.

### Timing

| Purpose | Duration | Easing |
|---|---|---|
| Hover / press | 200ms | `ease-cine` |
| Entrances | 320–450ms | `ease-cine` |
| Expression crossfade | 400ms | `ease-cine` |
| Meter change | spring | `stiffness 120, damping 18` |
| Ambient (breathe) | 5.5s | `ease-in-out` |

`ease-cine` = `cubic-bezier(0.22, 1, 0.36, 1)` — decelerating, filmic. Use for
almost everything. `ease-exit` for elements leaving.

### The test

Every animation must **convey state, not decorate it.** A meter that springs
conveys change. A pulsing border does not. `animate-pulse-gold` is reserved for
genuine alerts (the confirm-accusation button) — not ambient decoration.

Stagger lists at `i * 0.04s`, capped around `0.3s`, so long lists do not
cascade for seconds.

---

## 8. Accessibility

Implemented:

- Every colour pairing verified ≥ AA (§1); most ≥ AAA.
- Mood/status always carry a text label alongside icon and colour.
- Icons are `aria-hidden`; meaning lives in adjacent text.
- Portraits: `role="img"` with a descriptive label when `name` is passed,
  otherwise `aria-hidden` (avoids duplicating an adjacent name).
- Meters expose `role="meter"` + `aria-valuenow/min/max`.
- Transcript is `role="log" aria-live="polite"`.
- Toggles use `aria-pressed` (suspect cards, tabs, option tiles).
- Global `:focus-visible` gold ring at 2px with 2px offset.
- Both reduced-motion layers wired.

Known gaps, deliberately out of scope for a visual-only pass:

- Below `lg` (1024px) both side panels are hidden with no drawer fallback, so
  suspects, clues, notebook and HUD are unreachable on tablet and mobile. The
  visual system holds at those widths, but the panels need a sheet/drawer
  pattern — a layout change.
- `save()` still uses native `prompt()`/`alert()`, which are unstylable and
  break immersion.
- No favicon (`/favicon.ico` 404s).

---

## 9. Implementation recommendations

1. **Change colour in `globals.css` only.** `tailwind.config.ts` maps tokens; it
   should not contain literal colours.
2. **Re-run the contrast audit** after any palette edit. Cheap, and it prevents
   regressions the eye will not catch on a dark UI.
3. **Prefer tokens over literals.** `text-ink-muted`, not `text-white/70`.
   Arbitrary values are acceptable for one-off shadows, not for colour.
4. **Keep `min-h-0` on flex/grid children that scroll.** The investigation
   screen needs `grid-rows-[minmax(0,1fr)]` plus `min-h-0` on each column;
   without them the row sizes to its tallest child and the columns get centred,
   pushing the tab bar and message input off-screen.
5. **Do not add a second accent.** The palette works because gold is the only
   accent that means "attention". Semantic colours are for meters and alerts.
6. **Add a favicon and replace `prompt()`/`alert()`** when convenient — the two
   cheapest remaining polish wins.
7. **When adding an animation, state which state change it conveys.** If the
   answer is "none", it does not ship.

---

## 10. File map

```
src/
├── app/
│   ├── globals.css              tokens, base, utilities, atmosphere
│   ├── layout.tsx               font loading + MotionProvider
│   ├── page.tsx                 landing (title card)
│   ├── new/                     case setup
│   ├── brief/[id]/              opening dossier
│   ├── case/[id]/               investigation (3-column)
│   ├── notebook/[id]/           notebook (paper)
│   ├── accuse/[id]/             accusation (crimson)
│   ├── result/[id]/             verdict
│   ├── stats/                   record
│   └── settings/                settings + saves
├── components/
│   ├── motion-provider.tsx      global reduced-motion policy
│   ├── ui/                      button · card · badge · input · meter
│   └── game/
│       ├── avatar.tsx           procedural portrait engine
│       ├── character-card.tsx   suspect dossier
│       ├── transcript.tsx       the record
│       └── notebook-panel.tsx   notebook sections
└── lib/mood.ts                  mood/status presentation
tailwind.config.ts               theme mapping
```

Dependency added: `framer-motion@11.15.0` (pinned).
