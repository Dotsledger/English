# Sticky English

A mobile-first webapp prototype for Spanish speakers to absorb English phrases while scrolling short-form content — closer to TikTok/Stories than to a language course.

**Surface:** a full-screen swipeable feed of editorial micro-content about topics you'd read anyway.
**Hidden engine:** retrieval practice, Leitner spaced repetition, browser-native *spoken* production, and a local phrase-lifecycle memory — optimised for an adult learner whose bottleneck is lexical production (and specifically *speaking*), not comprehension. No streaks, no XP, no guilt, and — by design — no backlog wall after time away.

## Live demo

**https://dotsledger.github.io/English/** — auto-deployed on every push to `master` via
[.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml). The app has no server
routes, so it ships as a fully static export (`next build` with `output: "export"`, gated behind
the `GITHUB_PAGES=true` env var in `next.config.ts` so local dev is unaffected).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — best viewed in a mobile viewport.

## Test on a real phone

1. Start the dev server: `npm run dev`
2. Find your machine's LAN IP: `ipconfig getifaddr en0` (macOS)
3. Add that IP to `allowedDevOrigins` in [next.config.ts](next.config.ts) — Next.js blocks the
   dev JS bundle (React/hydration) for any origin other than `localhost` by default, so without
   this the page renders but swipe/taps silently do nothing
4. On a phone connected to the same wifi, open `http://<that-ip>:3000`

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## The learning engine

### Phrase lifecycle

Every phrase moves through `SEEN → RECOGNISED → PRODUCED → MASTERED`, and **only retrieval
advances it** — exposure alone never does:

- **SEEN** — appeared in a feed card.
- **RECOGNISED** — answered a multiple-choice retrieval correctly.
- **PRODUCED** — completed a cloze, or typed/spoke the phrase from the Spanish prompt.
- **MASTERED** — produced correctly twice at the two longest intervals, **or** passed the box-5
  free-production gate with a "Me salió" self-assessment (see below).

Stages never regress. Wrong answers (or a "No me salió" self-grade) only demote the Leitner box —
non-punitive by design.

### Spaced repetition (My Deck)

Leitner system, 5 boxes, intervals **1 / 3 / 7 / 16 / 35 days** (`lib/session/leitner.ts`).
Correct → up one box; wrong → down one box (floor 1), rescheduled at the new box's interval.
Phrases enter the queue when the user saves them (tap the phrase on any card) or fails a
checkpoint. "Ya la domino" suppresses a phrase everywhere and wins over deck entry.

The review exercise depends on the box (`lib/session/exercisePicker.ts`): box 1–2 multiple
choice (ES→EN, distractors drawn from the same category+level, `lib/exercises/mcq.ts`), box 3
cloze over an example sentence with a first-letter hint (`lib/exercises/cloze.ts`), boxes 4–5
free production. Typed answers forgive a single typo (Damerau–Levenshtein ≤ 1,
`lib/exercises/grade.ts`) unless the answer is short or the typo makes it ambiguous with another
phrase.

### Spoken production (browser-native, free)

Boxes 4–5 prefer **spoken** production where the browser supports it (`lib/speech.ts` wraps
`webkitSpeechRecognition`, `en-GB`): the Spanish prompt shows, you tap the mic and say the
phrase, and a fuzzy token match (`matchesSpokenTarget` in `lib/exercises/grade.ts`, ≥ 80%
per-token similarity, phrase may sit inside a longer utterance) grades it. A 10-second soft timer
adds gentle conversational pressure — visual only, never a failure. Support is **detected once at
startup** (`useSpeechAvailable`); if absent, or the mic is denied, the card silently falls back to
typing and stays typed for the session. Chrome/Edge (desktop + Android) support this over https;
Safari is partial and Firefox has none — so every spoken card has a full typed fallback.
Feed sessions also mix in ~1-in-5 **audio-first** cards: the sentence plays via TTS with the text
hidden, tap reveals the text, a second tap reveals the translation.

### The MASTERED gate (free production + self-assessment)

At box 5, a phrase that isn't mastered yet gets a free-production gate instead of a plain review
(`components/exercises/MasteryCard.tsx`): "Úsala en una frase tuya" — you write (or speak) your
own sentence, see it beside the model example(s), and self-grade. **Me salió** → MASTERED (stays
box 5); **Regular** → unchanged, back in 3 days; **No me salió** → down one box. Every attempt is
saved to a personal corpus (`KEY_SENTENCES`), shown on the card and in a read-only "Tus frases"
list in Settings, and included in export/import.

### Abandonment-proof SRS (survival layer)

Classic Leitner punishes absence with a growing backlog — the top abandonment trigger. Three pure
mechanisms in `lib/session/triage.ts` prevent that:

- **Displayed due count is capped at 8** — the home CTA never shows the raw backlog number.
- **Comeback mode** — after ≥ 4 days away, the home CTA becomes "Bienvenido de vuelta — 5 frases
  en 90 segundos" and launches a review-only micro-session of the most valuable due items
  (`/comeback`, `composeComebackSession`). No backlog number, no guilt copy.
- **Backlog auto-triage** — above 25 active due items, the least-invested overflow is *frozen* out
  of every count and queue; frozen items thaw at most 3/day once the queue is cleared to ≤ 10.
  Reconciliation runs on home mount and session end (`reconcileTriage`, `useReconcileTriage`).

All progress copy is loss-framing-free by policy (no "perdiste", "racha rota", etc.).

### Sessions

Infinite scroll is gone — everything is a 12–15 card session with an explicit end card
("Sesión hecha ✓" + per-session stats):

- **Rabbit hole** (`/feed/[topicId]`): the tapped topic's scenes first, then more topics from
  the same category (unseen first), with a retrieval checkpoint injected after every 4–5
  content cards testing a phrase seen *earlier in the same session*
  (`lib/session/composeCategorySession.ts`).
- **Daily Snack** (`/snack`): the one-tap default — ~60% due reviews (most overdue first,
  capped so a backlog never becomes a wall) interleaved with ~40% new content
  (`lib/session/composeSnackSession.ts`).

Session position lives only in React (`lib/session/runReducer.ts`); every learning result
commits to storage per card, so a mid-session reload loses position, never progress.

### Weekly mission, recap & progress

Every Monday (computed locally) three PRODUCED phrases become the week's mission: use them in a
real conversation, check them off manually for a one-box boost (`lib/mission.ts`). Also on Mondays,
a **weekly recap** (`lib/recap.ts`, `components/RecapCard.tsx`) celebrates the week that just
ended — active days, phrases newly produced (`DeckEntry.producedAt`), and the most-practised
category — positive framing only, no week-over-week comparison, shown once (acknowledged week
stored on the triage doc). Home also shows honest pipeline counts (Dominadas / En camino / Vistas)
and "días activos esta semana: n/7" — resets weekly, never framed as a loss.

### Level check (internal progress milestone)

An occasional, opt-in "Chequeo de nivel" gamifies advancement without gating
anything. It's an **internal progress score, not a CEFR certification** (stated
once, in a first-time-only tooltip on the home badge).

- Scale: a never-decreasing decimal per band, B2.0 → B2.10 → C1.0 → … → C2.10,
  starting at B2.0 (`lib/level.ts`). A weak check holds the score **flat**; it
  never drops, and it **never gates content** — every category/level stays
  browsable.
- Trigger: a milestone counter (`cardsSinceCheck`) increments on each newly-seen
  content card; at a re-rolled ~50–60 threshold, `SessionLoader` prepends an
  opt-in "Chequeo de nivel disponible ✨" card to normal feeds. It never
  auto-starts and never interrupts an in-progress session.
- Composition (`lib/checkSession.ts`, zero AI, existing exercises): ~40%
  recognition MCQ from MASTERED phrases, ~40% cloze from PRODUCED, ~20% stretch
  (recognition of unstudied next-band phrases), with fallbacks so it's always
  composable. The check scores 0–100% and **never mutates the deck**.
- Movement (`applyCheckResult`): ≥ 85% → +0.4 sublevel, 60–84% → +0.1, < 60% →
  no change; caps within a band at .10 and crosses to the next band's .0 only
  from .10; ceiling C2.10. The result screen is always forward-framed
  ("¡Subes a B2.4! 🎉" / "Sigues en B2.6 — un poco más y subes"). The current
  level shows as a small always-visible badge near the pipeline counters.

### Quick capture

The "+" button stores a phrase heard in real life (text + optional note/translation) straight
into deck box 1 (`lib/capture.ts`). Captured phrases review as free recall against the user's
own translation. `enrichCapture()` is a stub for future server-side enrichment.

## User data & storage

All state lives on-device in IndexedDB (single `kv` object store, JSON-string documents), with
a symmetric localStorage fallback and an in-memory backend for SSR (`lib/storage/backend.ts`).
Writes are debounced latest-wins per document and flushed on tab hide
(`lib/storage/writeQueue.ts`). Every document has a corruption-safe parser
(`lib/storage/docs.ts`) — bad data degrades to empty, never crashes.

The logical schema is versioned in a meta document. v1 (localStorage-only) data migrates
automatically on first load (`lib/storage/migrate.ts`): recognition-era results map to at most
stage RECOGNISED / box 3, since v1 never tested production. v1 keys are kept for rollback.

v3 added fields **without a destructive migration**: `DeckEntry.frozen` and `DeckEntry.producedAt`
are optional (existing entries load unchanged and default at read sites), and two new documents
(`KEY_TRIAGE` for the daily thaw budget + recap acknowledgement, `KEY_SENTENCES` for the personal
corpus) default to empty when absent. `Phrase.examples` is committed content, not user state, so
it needs no migration at all.

**Export / import:** Ajustes (⚙) → "Exportar mi progreso" downloads a versioned JSON bundle;
importing validates every document before writing and reloads the app.

## Architecture

- `lib/types.ts` — scene types, `Phrase`, `DeckEntry` (lifecycle + Leitner state), capture/activity/mission docs
- `lib/data/categories/{slug}.ts` — one content module per category (phrases, topics, scenes, checkpoints); `lib/data/{phrases,topics,scenes}.ts` are barrels that concatenate them, so imports never change
- `lib/sceneText.ts` + `tests/content.test.ts` — build-time guarantee that every scene's sticky phrase appears in its visible text and every phrase's example supports a cloze
- `lib/exercises/` — MCQ/cloze/free-type generation, grading, spoken-target matching, example rotation (pure, rng-injectable)
- `lib/session/` — Leitner math, category/snack/comeback composers, checkpoint interleaving, backlog triage, run reducer (pure)
- `lib/speech.ts` / `lib/recap.ts` — SpeechRecognition wrapper; pure weekly-recap builder
- `lib/level.ts` / `lib/checkSession.ts` — internal level engine (never-decreasing, non-gating) + level-check composer
- `lib/deckOps.ts` — one pure function per user interaction (seen, save, suppress, peek, answers, mastery self-grade, corpus)
- `lib/storage/` — backends, write queue, document parsers (deck/topics/captures/activity/mission/triage/sentences/level), migration, export/import
- `components/AppStateProvider.tsx` — single provider hydrating all documents; per-concern hooks (`useDeck`, `useCaptures`, …) with an update queue so writes before hydration are never lost
- `components/SessionPlayer.tsx` — the swipe shell: scenes (incl. audio-first), checkpoints, MCQ/typed/spoken reviews, mastery gate, end card
- `components/TopicGrid.tsx` — home hub: due/comeback CTA, Daily Snack, pipeline, recap, mission, filters, grid, capture, settings
- `tests/` — Vitest + Testing Library (content rules, storage, migration, exercises, composers, player)

No backend, no auth, no external APIs — all content is local TypeScript data; all user state is on-device.

## Adding content

1. Add entries to the category module in `lib/data/categories/` (or create a new module and
   register it in the three barrels). Every scene's `phraseId` must reference a phrase whose
   text (or a listed variant) appears verbatim in the scene's visible text, and **every example —
   the primary `example` and each entry in the optional `examples[]` — must contain the phrase and
   be cloze-able** — `npm run test` enforces all of this.
2. `examples[]` holds 2–3 alternative sentences (same phrase, different scenario); reviews and
   cloze rotate across `[example, ...examples]`. British English, ≤ 18 words, contemporary tone.
3. New categories appear in the home filter automatically (`CATEGORIES` is derived).
4. Levels are B2/C1/C2; phrases are 2–5 word chunks, British English, no textbook tone.
