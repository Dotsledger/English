# Audit + plan — phrase-acquisition system

Goal: make the app optimise for *phrases becoming usable*, not content consumed.
Constraint: safest incremental path; do not rewrite; preserve visuals, mobile,
hydration safety, and existing phrase IDs.

## 1. Audit — where things live today

| Spec concept | Already exists as | File |
|---|---|---|
| Phrase/chunk registry | `Phrase[]` (1,384 phrases, chunk-based) merged from 21 category files | `lib/data/phrases.ts`, `lib/data/categories/*` |
| Phrase item shape | `Phrase { id, text, meaningEs, example, examples[], variants[], level, tags[] }` | `lib/types.ts` |
| Memory / progress record | `DeckEntry { stage, box, timesSeen, correctCount, wrongCount, nextReviewAt, producedCorrectAtLongBoxes, producedAt, ... }` | `lib/types.ts` |
| Learning-state lifecycle | `PhraseStage = seen → recognised → produced → mastered` (only advances, only via retrieval) | `lib/types.ts`, `lib/session/leitner.ts` |
| Spaced repetition | Leitner 5-box, intervals `[1,3,7,16,35]`d; correct → box+1, wrong → box−1 | `lib/session/leitner.ts` |
| Attempt → status upgrade | `applyReviewResult` (MCQ→recognised, cloze/typed→produced, 2× at box≥4→mastered) | `lib/session/leitner.ts`, `lib/deckOps.ts` |
| Adaptive card by status | `exerciseTypeFor(box)` box≤2 MCQ / 3 cloze / 4–5 freetype; box5+unmastered → mastery gate | `lib/session/exercisePicker.ts` |
| Card types | Context (10 scene types), MCQ (recognition), Cloze, FreeType (reverse), Spoken (production), Mastery | `components/scenes/*`, `components/exercises/*` |
| Two feeds | **Explore** = topic grid (`/`), **Review** = Daily Snack (`/snack`), category feeds (`/feed/[id]`) | `app/page.tsx`, `app/snack/page.tsx`, `app/feed/[topicId]` |
| Session recap | `SessionEnd`, weekly `Recap { activeDays, produced, topCategory }` | `components/SessionEnd.tsx`, `lib/recap.ts` |
| Progress by state | `ProgressPipeline` (vistas / en camino / dominadas) | `components/ProgressPipeline.tsx` |
| Answer validation | `gradeAnswer` → correct / near (1 typo) / wrong; normalises case+punctuation | `lib/exercises/grade.ts` |
| Storage safety | IndexedDB + localStorage + memory fallback; per-doc corruption-safe parsers; debounced write queue | `lib/storage/*` |
| Hydration safety | deterministic first render, `now` read post-mount | throughout |
| Due selection | `dueEntries` / `upcomingEntries` (filters inDeck, !suppressed, !frozen, nextReviewAt≤now) | `lib/session/leitner.ts` |

**Verdict:** the learning engine, SRS, retrieval-gating, storage safety, two feeds,
validation, and recap are all present and solid. The spec's suggested greenfield
types would duplicate them.

## 2. Genuine gaps (what the spec adds that we don't have)

G1. **Stage granularity.** We have 4 stages; the spec wants 6
    (`new/seen/recognized/recalled/usable/fluent`). Real missing distinction:
    split today's `produced` into **recalled** (cloze/reverse — recall with
    scaffold) vs **usable** (situation/production — self-generated). `new` is
    also implicit today (an entry only exists once seen).

G2. **Rich phrase metadata.** No `usageContext`, `situations`, `contrastWith`,
    `avoid`/common-mistake, `collocations`, `literalMeaningEs`, per-phrase
    `difficulty`. These power Context / Situation / Contrast cards.

G3. **Card types.** Missing **Situation** (transfer to real life) and
    **Contrast** (distinguish confusables) cards. Context card exists only as
    passive scenes, not as an explicit "Got it / Already know / Practice now"
    intro with the common-mistake line.

G4. **Life-phrase content.** The 1,384 phrases are topic/editorial-flavoured.
    The spec's target vocabulary ("I'll figure it out", "I'm on the fence about
    it", "Don't hesitate to ask"…) is largely absent — these are the reusable
    daily chunks the product principle is really about.

G5. **State-transition recap.** Session recap counts cards/produced, not
    per-session transitions ("3 Seen→Recognised, 1 became Usable"). We don't
    snapshot pre-session stages to diff them.

G6. **Adaptive mapping to the new stages.** `exerciseTypeFor` keys off box, not
    stage; needs situation/contrast slotted in for recalled/usable/fluent.

## 3. Plan — extend, don't fork (phased, each phase ships green)

### Phase A — 6-stage lifecycle (data + engine)  ⟵ foundational
- Extend `PhraseStage` → `"new" | "seen" | "recognised" | "recalled" | "usable" | "mastered"`.
  Keep Spanish/existing UI labels; internal names stay English.
  Mapping from old: `produced → recalled` (safe: both are "recall with/without
  scaffold"), `mastered → mastered`. Add `recalled`/`usable` split going forward.
  *(Naming: keep `recognised`, use `usable` for situation/production, `mastered`
  as top = spec's "fluent". Avoids a churny rename of `recognised`→`recognized`.)*
- `leitner.ts`: extend `STAGE_RANK`; cloze/reverse correct → `recalled`;
  situation/production correct → `usable`; keep 2×@box≥4 → `mastered`.
- `docs.ts`: add new stages to `STAGES`; **migration** maps any persisted
  `"produced"` → `"recalled"` on load (corruption-safe, no version bump needed —
  parser already tolerates unknown/absent; add explicit remap).
- Tests: never-regress invariant, seen≠learned, each upgrade path, wrong→soon.

### Phase B — rich phrase metadata (optional fields, backward compatible)
- Extend `Phrase` with **optional** `usageContext?`, `situations?[]`,
  `collocations?[]`, `avoid?`, `literalMeaningEs?`, `contrastWith?[]`,
  `difficulty?`. All optional ⇒ 1,384 existing phrases load unchanged.
- New file `lib/data/categories/core-life-phrases.ts`: seed ~30 high-value
  life chunks from the spec list, each *fully* populated (meaning, context,
  examples, situations, contrast, common mistake). Tag `life`, `core`.
- Cards that need rich data activate only when the fields are present.

### Phase C — Situation + Contrast cards
- `components/exercises/SituationCard.tsx` — real-life prompt → self-assessment
  (Me salió / Casi / No me salió) since exact validation is brittle; stores
  attempt + result. Correct → `usable`.
- `components/exercises/ContrastCard.tsx` — confusable A vs B, one decision Q;
  correct is a recognition-grade result.
- `exercisePicker.ts`: when a phrase has `situations`, box 4–5 may draw a
  Situation card; when it has `contrastWith`, occasionally a Contrast card.
  Fallback to current freetype/cloze when rich data absent.

### Phase D — explicit Context intro card
- Upgrade the phrase-intro moment to the spec's Context card (phrase, natural
  meaning, when-to-use, 1–2 examples, common mistake) with
  "Got it / Already know this / Practice now". "Got it" → `seen` only.

### Phase E — state-transition recap
- Snapshot each in-session phrase's stage at session start; at
  `SessionEnd` diff to show transitions ("2 Recognised→Recalled, 1 became
  Usable, 5 due tomorrow"). Reframe copy away from "viewed N cards".
- Optional: extend `ProgressPipeline` buckets to the 6 states.

### Phase F — QA
- `npm run typecheck && lint && test && build`; browser-verify at 375px
  (both feeds, a full session, transitions in recap, corrupted-store no-crash).
- Commit per phase; do not push until confirmed.

## 4. Deliberate deviations from the literal spec (flagged)
- **No `lib/phraseData.ts` / no new `PhraseItem`/`PhraseProgress`/`PhraseStatus`
  types.** We extend `Phrase` + `DeckEntry` + `PhraseStage` instead — same
  intent, zero duplication, no 1,384-phrase migration.
- **Keep `recognised` spelling** and use `mastered` as the top ("fluent") tier
  rather than renaming the enum wholesale — a rename touches ~10 files and every
  persisted record for no learning benefit.
- **Enrich ~30 curated phrases, not all 1,384** — hand-writing usageContext/
  situations/contrast for 1,384 isn't feasible or valuable; the rich cards light
  up where the data exists and degrade gracefully elsewhere.

## 5. Risks / notes
- Extending the stage enum is the one change touching persisted data — handled by
  an on-load remap in `docs.ts` (never throws; unknown → dropped as today).
- Situation/Contrast self-assessment is honest about no-AI-validation.
- Everything stays local-only; no backend/analytics.
