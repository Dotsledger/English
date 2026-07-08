import { describe, it, expect } from "vitest";
import type { Phrase, PhraseStage } from "@/lib/types";
import {
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
  it("puts contrast first for collocations and traps and false friends", () => {
    for (const c of ["collocation", "spanish_speaker_trap", "false_friend"] as const) {
      expect(getPreferredExerciseTypesForPhrase(mk({ category: c }))[0]).toBe("contrast");
    }
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

  it("collocations prefer contrast, else cloze — never MCQ", () => {
    const withContrast = mk({
      category: "collocation",
      contrastWith: [{ phrase: "do a decision", explanationEs: "..." }],
    });
    expect(resolvePracticeType(withContrast, "seen")).toBe("contrast");
    const avoidOnly = mk({ category: "collocation", avoid: "no 'do progress'" });
    notMcq(resolvePracticeType(avoidOnly, "seen")); // → cloze
    expect(resolvePracticeType(avoidOnly, "seen")).toBe("cloze");
  });

  it("traps and false friends attack the error with contrast/correction first", () => {
    const trap = mk({
      category: "spanish_speaker_trap",
      contrastWith: [{ phrase: "depend of", explanationEs: "..." }],
    });
    expect(resolvePracticeType(trap, "seen")).toBe("contrast");
    const ff = mk({
      category: "false_friend",
      contrastWith: [{ phrase: "actualmente", explanationEs: "..." }],
    });
    expect(resolvePracticeType(ff, "recognised")).toBe("contrast");
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
