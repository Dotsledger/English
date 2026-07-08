import { describe, it, expect } from "vitest";
import type { Phrase, PhraseStage } from "@/lib/types";
import {
  canGeneratePractice,
  getCorrectionWrongForms,
  getPreferredExerciseTypesForPhrase,
  resolvePracticeType,
  type PracticeType,
} from "@/lib/session/exercisePolicy";

/** Minimal phrase with a cloze-able example (the phrase text appears in it). */
function mk(over: Partial<Phrase>): Phrase {
  return {
    id: "x",
    text: "deal with",
    meaningEs: "lidiar con",
    example: "I'll deal with it.",
    level: "B2",
    tags: [],
    ...over,
  };
}

const STAGES: PhraseStage[] = ["new", "seen", "recognised", "recalled", "usable", "mastered"];

describe("getPreferredExerciseTypesForPhrase", () => {
  it("puts production first for sentence frames", () => {
    expect(getPreferredExerciseTypesForPhrase(mk({ category: "sentence_frame" }))[0]).toBe("production");
  });
  it("puts situation first for phrasal verbs", () => {
    expect(getPreferredExerciseTypesForPhrase(mk({ category: "phrasal_verb" }))[0]).toBe("situation");
  });
  it("prefers typed correction for collocations and traps, contrast for false friends", () => {
    for (const c of ["collocation", "spanish_speaker_trap"] as const) {
      const order = getPreferredExerciseTypesForPhrase(mk({ category: c }));
      expect(order[0]).toBe("typed_correction");
      expect(order).toContain("correction"); // choice correction remains as the earlier-stage fallback
    }
    expect(getPreferredExerciseTypesForPhrase(mk({ category: "false_friend" }))[0]).toBe("contrast");
  });
  it("puts situation first for discourse markers, work, daily, core chunks", () => {
    for (const c of ["discourse_marker", "work_communication", "daily_life", "core_chunk"] as const) {
      expect(getPreferredExerciseTypesForPhrase(mk({ category: c }))[0]).toBe("situation");
    }
  });
});

describe("resolvePracticeType — category × stage × metadata", () => {
  const notMcq = (t: PracticeType) => expect(t).not.toBe("recognition");

  it("sentence frames reach production once recalled, situation/cloze earlier — never stuck on MCQ", () => {
    const frame = mk({
      category: "sentence_frame",
      situations: ["A realistic prompt that forces the learner to produce the frame naturally."],
    });
    expect(resolvePracticeType(frame, "recalled")).toBe("production");
    expect(resolvePracticeType(frame, "recognised")).toBe("situation");
    // seen: production/situation/reverse not unlocked yet → cloze, not MCQ
    expect(resolvePracticeType(frame, "seen")).toBe("cloze");
  });

  it("phrasal verbs prefer situation, then reverse — not MCQ when recalled", () => {
    const pv = mk({
      category: "phrasal_verb",
      situations: ["Un compañero reporta un fallo y te ofreces a investigarlo en detalle."],
    });
    expect(resolvePracticeType(pv, "recalled")).toBe("situation");
    // no situations → falls to reverse once recognised
    const pvNoSit = mk({ category: "phrasal_verb" });
    expect(resolvePracticeType(pvNoSit, "recognised")).toBe("reverse");
  });

  it("collocations get correction (wrong form) from contrastWith or an avoid list, else cloze — never MCQ", () => {
    const withContrast = mk({
      category: "collocation",
      contrastWith: [{ phrase: "do a decision", explanationEs: "..." }],
    });
    expect(resolvePracticeType(withContrast, "seen")).toBe("correction");
    // avoid as an explicit wrong-form array also drives correction
    const avoidArray = mk({ category: "collocation", avoid: ["do progress"] });
    expect(resolvePracticeType(avoidArray, "seen")).toBe("correction");
    // avoid as an explanation string (no clean form, no contrastWith) → cloze, not MCQ
    const avoidExplanation = mk({ category: "collocation", avoid: "Se dice make progress, no do progress." });
    notMcq(resolvePracticeType(avoidExplanation, "seen"));
    expect(resolvePracticeType(avoidExplanation, "seen")).toBe("cloze");
  });

  it("traps attack the error with correction first; false friends with contrast first", () => {
    const trap = mk({
      category: "spanish_speaker_trap",
      contrastWith: [{ phrase: "depend of", explanationEs: "..." }],
    });
    expect(resolvePracticeType(trap, "seen")).toBe("correction");
    const ff = mk({
      category: "false_friend",
      contrastWith: [{ phrase: "actualmente", explanationEs: "..." }],
    });
    expect(resolvePracticeType(ff, "recognised")).toBe("contrast");
  });

  it("upgrades to TYPED correction once past recognition (collocation & trap)", () => {
    const colloc = mk({
      category: "collocation",
      contrastWith: [{ phrase: "do a decision", explanationEs: "..." }],
    });
    // early → choice correction; recognised/recalled → typed correction
    expect(resolvePracticeType(colloc, "seen")).toBe("correction");
    expect(resolvePracticeType(colloc, "recognised")).toBe("typed_correction");
    expect(resolvePracticeType(colloc, "recalled")).toBe("typed_correction");

    const trap = mk({
      category: "spanish_speaker_trap",
      contrastWith: [{ phrase: "depend of", explanationEs: "..." }],
    });
    expect(resolvePracticeType(trap, "recognised")).toBe("typed_correction");
  });

  it("getCorrectionWrongForms returns clean forms only (contrastWith + avoid array, not explanation)", () => {
    expect(getCorrectionWrongForms(mk({ contrastWith: [{ phrase: "do a decision", explanationEs: "" }] }))).toEqual(["do a decision"]);
    expect(getCorrectionWrongForms(mk({ avoid: ["win time"] }))).toEqual(["win time"]);
    expect(getCorrectionWrongForms(mk({ avoid: "Se dice save time, no win time." }))).toEqual([]);
    expect(getCorrectionWrongForms(mk({}))).toEqual([]);
  });

  it("typed correction needs a clean wrong form — not an explanation-only avoid", () => {
    const clean = mk({ category: "collocation", contrastWith: [{ phrase: "do progress", explanationEs: "" }] });
    expect(canGeneratePractice("typed_correction", clean)).toBe(true);
    const arr = mk({ category: "collocation", avoid: ["do progress"] });
    expect(canGeneratePractice("typed_correction", arr)).toBe(true);
    const explanationOnly = mk({ category: "collocation", avoid: "Se dice make progress, no do progress." });
    expect(canGeneratePractice("typed_correction", explanationOnly)).toBe(false);
    // …so a recognised collocation with only an explanation avoid falls to cloze, not typed correction
    expect(resolvePracticeType(explanationOnly, "recognised")).toBe("cloze");
  });

  it("work items reach situation/production; daily items prefer situation", () => {
    const work = mk({
      category: "work_communication",
      situations: ["No entiendes una instrucción del jefe y pides que la aclare con calma."],
    });
    expect(resolvePracticeType(work, "recognised")).toBe("situation");
    const daily = mk({
      category: "daily_life",
      situations: ["El tráfico está fatal y avisas de que vas a llegar bastante tarde."],
    });
    expect(resolvePracticeType(daily, "recalled")).toBe("situation");
  });

  it("falls back gracefully when metadata is missing (no crash, never ungeneratable)", () => {
    // Sentence frame with NO situations, at seen: can't do production/situation/reverse → cloze
    const bare = mk({ category: "sentence_frame" });
    for (const stage of STAGES) {
      const t = resolvePracticeType(bare, stage);
      expect(["cloze", "reverse", "recognition", "production"]).toContain(t);
    }
  });

  it("a phrase with no cloze-able example still resolves (to recognition)", () => {
    const weird = mk({ category: "phrasal_verb", example: "no phrase here", text: "zzz zzz" });
    // situation/reverse gated at new; cloze can't generate; → recognition
    expect(resolvePracticeType(weird, "new")).toBe("recognition");
  });
});
