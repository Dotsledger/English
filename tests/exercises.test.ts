import { describe, it, expect } from "vitest";
import type { Phrase } from "@/lib/types";
import { buildPhraseCategoryIndex, phraseCategoryIndex } from "@/lib/exercises/phraseIndex";
import { generateRecognitionMcq, generateCheckpointMcq } from "@/lib/exercises/mcq";
import { generateCloze, locatePhrase } from "@/lib/exercises/cloze";
import { generateFreeType, generateCaptureFreeType } from "@/lib/exercises/freetype";
import { gradeAnswer, withinEditDistance1 } from "@/lib/exercises/grade";
import { phrases } from "@/lib/data/phrases";
import { contentScenes } from "@/lib/data/scenes";
import { topics } from "@/lib/data/topics";
import { normalize } from "@/lib/text";

function makePhrase(overrides: Partial<Phrase> & { id: string }): Phrase {
  return {
    text: overrides.id.replace(/-/g, " "),
    meaningEs: `es-${overrides.id}`,
    example: `An example with ${overrides.id.replace(/-/g, " ")} inside.`,
    level: "B2",
    tags: [],
    ...overrides,
  };
}

// A seeded deterministic rng (mulberry32) so option order is reproducible.
function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("phraseCategoryIndex", () => {
  it("maps every scene-used phrase to at least one category", () => {
    for (const scene of contentScenes) {
      const categories = phraseCategoryIndex.get(scene.phraseId);
      expect(categories, scene.phraseId).toBeDefined();
      expect(categories!.size).toBeGreaterThan(0);
    }
  });

  it("collects all categories for a phrase reused across categories", () => {
    const scenes = [
      { phraseId: "p", topicId: "t1" },
      { phraseId: "p", topicId: "t2" },
    ] as never[];
    const fakeTopics = [
      { id: "t1", category: "Travel" },
      { id: "t2", category: "Sports" },
    ] as never[];
    const index = buildPhraseCategoryIndex(scenes, fakeTopics);
    expect(index.get("p")).toEqual(new Set(["Travel", "Sports"]));
  });
});

describe("MCQ generation", () => {
  const rng = () => seededRng(42);

  it("produces 3 unique options with the correct answer present exactly once", () => {
    for (const phrase of phrases.slice(0, 25)) {
      const mcq = generateRecognitionMcq(phrase, phrases, phraseCategoryIndex, rng());
      expect(mcq.options).toHaveLength(3);
      expect(new Set(mcq.options).size).toBe(3);
      expect(mcq.options[mcq.correctIndex]).toBe(phrase.text);
      expect(mcq.options.filter((o) => o === phrase.text)).toHaveLength(1);
      expect(mcq.prompt).toContain(phrase.meaningEs);
    }
  });

  it("prefers distractors sharing category and level when the pool allows", () => {
    const phrase = phrases.find((p) => phraseCategoryIndex.has(p.id))!;
    const mcq = generateRecognitionMcq(phrase, phrases, phraseCategoryIndex, rng());
    const targetCategories = phraseCategoryIndex.get(phrase.id)!;
    for (const option of mcq.options) {
      if (option === phrase.text) continue;
      const distractor = phrases.find((p) => p.text === option)!;
      expect(distractor.level).toBe(phrase.level);
      const categories = phraseCategoryIndex.get(distractor.id)!;
      expect([...categories].some((c) => targetCategories.has(c))).toBe(true);
    }
  });

  it("falls back down the ladder when the pool is starved", () => {
    const target = makePhrase({ id: "target-phrase", level: "C2" });
    const others = [
      makePhrase({ id: "other-one", level: "B2" }),
      makePhrase({ id: "other-two", level: "B2" }),
    ];
    const mcq = generateRecognitionMcq(target, [target, ...others], new Map(), rng());
    expect(mcq.options).toHaveLength(3);
  });

  it("never offers a second correct option (variant collision)", () => {
    const target = makePhrase({ id: "sort-of", variants: ["kind of"] });
    const collider = makePhrase({ id: "kind-of", text: "kind of" });
    const filler1 = makePhrase({ id: "filler-one" });
    const filler2 = makePhrase({ id: "filler-two" });
    for (let seed = 1; seed <= 10; seed++) {
      const mcq = generateRecognitionMcq(
        target,
        [target, collider, filler1, filler2],
        new Map(),
        seededRng(seed)
      );
      expect(mcq.options).not.toContain("kind of");
    }
  });

  it("never offers a distractor with the same Spanish meaning", () => {
    const target = makePhrase({ id: "a-phrase", meaningEs: "más o menos" });
    const ambiguous = makePhrase({ id: "b-phrase", meaningEs: "más o menos" });
    const filler1 = makePhrase({ id: "filler-one" });
    const filler2 = makePhrase({ id: "filler-two" });
    for (let seed = 1; seed <= 10; seed++) {
      const mcq = generateRecognitionMcq(
        target,
        [target, ambiguous, filler1, filler2],
        new Map(),
        seededRng(seed)
      );
      expect(mcq.options).not.toContain(ambiguous.text);
    }
  });

  it("checkpoint MCQs blank the phrase inside the example", () => {
    const phrase = phrases[0];
    const mcq = generateCheckpointMcq(phrase, phrases, phraseCategoryIndex, rng());
    expect(mcq.prompt).toContain("___");
    expect(normalize(mcq.prompt)).not.toContain(normalize(phrase.text));
  });
});

describe("cloze generation", () => {
  it("blanks the canonical phrase and preserves surrounding text", () => {
    const phrase = makePhrase({
      id: "not-worth-it",
      text: "not worth it",
      example: "If the battery costs half the price, it's not worth it.",
    });
    const cloze = generateCloze(phrase)!;
    expect(cloze.before).toBe("If the battery costs half the price, it's ");
    expect(cloze.after).toBe(".");
    expect(cloze.answer).toBe("not worth it");
    expect(cloze.hint).toBe("n");
  });

  it("matches a variant and hints from the variant's first letter", () => {
    const phrase = makePhrase({
      id: "it-depends-on",
      text: "it depends on",
      variants: ["depends on"],
      example: "Everything depends on the battery.",
    });
    const cloze = generateCloze(phrase)!;
    expect(cloze.answer).toBe("depends on");
    expect(cloze.hint).toBe("d");
    expect(cloze.acceptedAnswers).toEqual(["it depends on", "depends on"]);
  });

  it("matches across curly apostrophes and capitalization", () => {
    const phrase = makePhrase({
      id: "thats-the-catch",
      text: "that's the catch",
      example: "That’s the catch nobody mentions.",
    });
    const cloze = generateCloze(phrase)!;
    expect(cloze.answer).toBe("That’s the catch");
    expect(cloze.before).toBe("");
  });

  it("returns null when the phrase is absent from the example", () => {
    const phrase = makePhrase({
      id: "missing-phrase",
      text: "missing phrase",
      example: "This sentence has nothing to offer.",
    });
    expect(generateCloze(phrase)).toBeNull();
  });

  it("locatePhrase finds the first occurrence", () => {
    const phrase = makePhrase({ id: "red-flag", text: "red flag", example: "" });
    const location = locatePhrase("A red flag is a red flag.", phrase)!;
    expect(location.start).toBe(2);
  });
});

describe("free-type generation", () => {
  it("builds from a catalog phrase's meaning and variants", () => {
    const phrase = makePhrase({ id: "sort-of", variants: ["kind of"] });
    const exercise = generateFreeType(phrase);
    expect(exercise.promptEs).toBe(phrase.meaningEs);
    expect(exercise.acceptedAnswers).toEqual([phrase.text, "kind of"]);
  });

  it("builds from a capture using its own translation", () => {
    const exercise = generateCaptureFreeType({
      id: "c1",
      text: "circle back",
      note: "meeting jargon",
      meaningEs: "retomar más tarde",
      createdAt: 1,
    });
    expect(exercise.promptEs).toBe("retomar más tarde");
    expect(exercise.acceptedAnswers).toEqual(["circle back"]);
  });
});

describe("withinEditDistance1", () => {
  it("accepts identity, substitution, insertion, deletion, transposition", () => {
    expect(withinEditDistance1("worth", "worth")).toBe(true);
    expect(withinEditDistance1("worth", "worta")).toBe(true);
    expect(withinEditDistance1("worth", "wortsh")).toBe(true);
    expect(withinEditDistance1("worth", "wort")).toBe(true);
    expect(withinEditDistance1("worth", "wroth")).toBe(true);
  });

  it("rejects distance 2", () => {
    expect(withinEditDistance1("worth", "warta")).toBe(false);
    expect(withinEditDistance1("worth", "wor")).toBe(false);
    expect(withinEditDistance1("ab", "ba" + "x")).toBe(false);
  });
});

describe("gradeAnswer", () => {
  const accepted = ["not worth it"];

  it("accepts exact, case, whitespace, apostrophe and punctuation noise", () => {
    expect(gradeAnswer("not worth it", accepted).verdict).toBe("correct");
    expect(gradeAnswer("  Not  Worth It. ", accepted).verdict).toBe("correct");
    expect(gradeAnswer("it’s the catch", ["it's the catch"]).verdict).toBe("correct");
  });

  it("accepts a listed variant as fully correct", () => {
    const result = gradeAnswer("kind of", ["sort of", "kind of"]);
    expect(result.verdict).toBe("correct");
    expect(result.verdict === "correct" && result.matched).toBe("kind of");
  });

  it("grades one typo as near (counts as correct, shows canonical)", () => {
    const result = gradeAnswer("not wroth it", accepted);
    expect(result.verdict).toBe("near");
    expect(result.verdict === "near" && result.matched).toBe("not worth it");
  });

  it("requires exactness for short answers", () => {
    expect(gradeAnswer("as if", ["as of"]).verdict).toBe("wrong");
  });

  it("gives no credit when the typo is ambiguous with another phrase", () => {
    const result = gradeAnswer("burn out", ["burn ouy"], ["burn out"]);
    expect(result.verdict).toBe("wrong");
  });

  it("rejects empty input and real mistakes", () => {
    expect(gradeAnswer("", accepted).verdict).toBe("wrong");
    expect(gradeAnswer("completely different", accepted).verdict).toBe("wrong");
  });
});

describe("catalog cloze eligibility (build-time guarantee)", () => {
  it("every phrase's example contains the phrase or a variant", () => {
    const failures = phrases.filter((p) => generateCloze(p) === null).map((p) => p.id);
    expect(failures).toEqual([]);
  });
});

describe("catalog MCQ soundness", () => {
  it("every phrase can generate a valid recognition MCQ", () => {
    const rng = seededRng(7);
    for (const phrase of phrases) {
      const mcq = generateRecognitionMcq(phrase, phrases, phraseCategoryIndex, rng);
      expect(new Set(mcq.options).size, phrase.id).toBe(3);
      expect(mcq.options[mcq.correctIndex], phrase.id).toBe(phrase.text);
    }
  });
});

describe("topics fixture sanity", () => {
  it("topics used by the index all expose a category", () => {
    for (const topic of topics) expect(topic.category.length).toBeGreaterThan(0);
  });
});
