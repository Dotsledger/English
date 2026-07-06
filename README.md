# Sticky English

A mobile-first webapp prototype for Spanish speakers to absorb English phrases while scrolling short-form content — closer to TikTok/Stories than to a language course.

**Surface:** a full-screen swipeable feed of editorial micro-content about topics you'd read anyway.
**Hidden engine:** phrase repetition, casual checkpoints, and a local spaced-repetition memory.

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

## Architecture

- `lib/types.ts` — discriminated-union scene types, phrase and memory types (levels are B2/C1/C2)
- `lib/data/` — mock phrases (309), a pool of 320 topic tiles across 20 categories, 650 content
  scenes, 48 checkpoints, feed builder
- `lib/pickTopics.ts` — pure random-sample utility used by the "refresh" button and by filtering;
  `pickTopicsPreferringUnseen` additionally avoids resurfacing completed topics until the fresh pool
  runs out
- `lib/phraseMemory.ts` — pure localStorage memory engine (seen counts, recall scheduling,
  corruption-safe parsing); `getDueEntries` surfaces phrases whose `nextReviewAt` has passed
- `lib/usePhraseMemory.ts` — React hook over the engine
- `lib/topicProgress.ts` / `lib/useTopicProgress.ts` — pure localStorage store + hook tracking which
  topics a user has finished
- `components/DueReview.tsx` — home-screen strip linking due-for-review phrases back to a feed that
  teaches them
- `components/TopicGrid.tsx` — topic grid; level (B2/C1/C2) + category multi-select filters, shows 4
  tiles at a time, "↻" re-samples 4 more from the filtered pool, swaps out already-completed
  defaults once progress loads
- `components/Feed.tsx` — full-screen feed: swipe + keyboard navigation, checkpoint gating, marks
  the topic completed on reaching the end
- `components/scenes/` — ten visually distinct scene renderers
- `tests/` — Vitest + Testing Library (content rules, memory engine, interaction)

No backend, no auth, no database, no external APIs — all data is local mock data.

### On the "refresh" button

Right now "new topics" means sampling from a hand-written pool of 20 (`lib/data/topics.ts`) —
there's no real trend signal behind it. If this ships as a real product, the trends themselves
need to come from somewhere with an actual API: YouTube's Data API v3 ("most popular" by
region/category) is the only one of Google/TikTok/Instagram/YouTube with a stable public API;
Google Trends has none, and TikTok/Instagram don't expose trending topics without partner access.
Turning a raw trending topic into a scene that passes this app's content bar (sticky phrase must
appear naturally in the visible text, no textbook tone) needs an LLM call — which means moving the
"no backend" prototype constraint to a real API route that hides the keys, calls the model
server-side, and validates the output before it ever reaches a user (the `phraseAppearsIn` check
in `lib/sceneText.ts` currently runs at build/test time against hand-written content; live
generation would need to run that same check at request time and re-prompt or reject on failure).
