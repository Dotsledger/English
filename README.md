# Sticky English

A mobile-first webapp prototype for Spanish speakers to absorb English phrases while scrolling short-form content — closer to TikTok/Stories than to a language course.

**Surface:** a full-screen swipeable feed of editorial micro-content about topics you'd read anyway.
**Hidden engine:** retrieval practice, Leitner spaced repetition, and a local phrase-lifecycle memory — optimised for an adult learner whose bottleneck is lexical *production*, not comprehension. No streaks, no XP, no guilt.

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
- **PRODUCED** — completed a cloze or typed the phrase from the Spanish prompt.
- **MASTERED** — produced correctly twice while sitting at the two longest review intervals.

Stages never regress. Wrong answers only demote the Leitner box — non-punitive by design.

### Spaced repetition (My Deck)

Leitner system, 5 boxes, intervals **1 / 3 / 7 / 16 / 35 days** (`lib/session/leitner.ts`).
Correct → up one box; wrong → down one box (floor 1), rescheduled at the new box's interval.
Phrases enter the queue when the user saves them (tap the phrase on any card) or fails a
checkpoint. "Ya la domino" suppresses a phrase everywhere and wins over deck entry.

The review exercise depends on the box (`lib/session/exercisePicker.ts`): boxes 1–2 multiple
choice (ES→EN, distractors drawn from the same category+level, `lib/exercises/mcq.ts`), boxes
3–4 cloze over the phrase's own example sentence with a first-letter hint
(`lib/exercises/cloze.ts`), box 5 free-typing from the Spanish prompt. Typed answers forgive a
single typo (Damerau–Levenshtein ≤ 1, `lib/exercises/grade.ts`) unless the answer is short or
the typo makes it ambiguous with another phrase.

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

### Weekly mission & progress

Every Monday (computed locally) three PRODUCED phrases become the week's mission: use them in a
real conversation, check them off manually for a one-box boost (`lib/mission.ts`). Home shows
honest pipeline counts (Dominadas / En camino / Vistas) and "días activos esta semana: n/7" —
resets weekly, never framed as a loss.

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

**Export / import:** Ajustes (⚙) → "Exportar mi progreso" downloads a versioned JSON bundle;
importing validates every document before writing and reloads the app.

## Architecture

- `lib/types.ts` — scene types, `Phrase`, `DeckEntry` (lifecycle + Leitner state), capture/activity/mission docs
- `lib/data/categories/{slug}.ts` — one content module per category (phrases, topics, scenes, checkpoints); `lib/data/{phrases,topics,scenes}.ts` are barrels that concatenate them, so imports never change
- `lib/sceneText.ts` + `tests/content.test.ts` — build-time guarantee that every scene's sticky phrase appears in its visible text and every phrase's example supports a cloze
- `lib/exercises/` — MCQ/cloze/free-type generation and grading (pure, rng-injectable)
- `lib/session/` — Leitner math, session composers, checkpoint interleaving, run reducer (pure)
- `lib/deckOps.ts` — one pure function per user interaction (seen, save, suppress, peek, answers)
- `lib/storage/` — backends, write queue, document parsers, migration, export/import
- `components/AppStateProvider.tsx` — single provider hydrating all documents; per-concern hooks (`useDeck`, `useCaptures`, …) with an update queue so writes before hydration are never lost
- `components/SessionPlayer.tsx` — the swipe shell: scenes, checkpoints, reviews, end card
- `components/TopicGrid.tsx` — home hub: due CTA, Daily Snack, pipeline, mission, filters, grid, capture
- `tests/` — Vitest + Testing Library (content rules, storage, migration, exercises, composers, player)

No backend, no auth, no external APIs — all content is local TypeScript data; all user state is on-device.

## Adding content

1. Add entries to the category module in `lib/data/categories/` (or create a new module and
   register it in the three barrels). Every scene's `phraseId` must reference a phrase whose
   text (or a listed variant) appears verbatim in the scene's visible text, and every phrase's
   `example` must contain the phrase — `npm run test` enforces both.
2. New categories appear in the home filter automatically (`CATEGORIES` is derived).
3. Levels are B2/C1/C2; phrases are 2–5 word chunks, British English, no textbook tone.
