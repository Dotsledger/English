import { describe, it, expect } from "vitest";
import type { DeckStore, PhraseStage } from "@/lib/types";
import { freshEntry } from "@/lib/deckOps";
import { addedOnCount, getStageLabel, notebookGroups } from "@/lib/notebook";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-07-09T12:00:00").getTime();

function entry(
  id: string,
  over: Partial<ReturnType<typeof freshEntry>>
): ReturnType<typeof freshEntry> {
  return { ...freshEntry(id, "catalog"), ...over };
}

describe("notebookGroups", () => {
  it("groups engaged phrases by stage and omits empty groups", () => {
    const deck: DeckStore = {
      a: entry("a", { inDeck: true, stage: "recognised", timesSeen: 2, nextReviewAt: NOW + DAY * 3 }),
      b: entry("b", { inDeck: true, stage: "recalled", timesSeen: 3, nextReviewAt: NOW + DAY }),
      c: entry("c", { inDeck: false, stage: "seen", timesSeen: 1 }),
    };
    const groups = notebookGroups(deck, NOW);
    const stages = groups.map((g) => g.stage);
    expect(stages).toEqual(["seen", "recognised", "recalled"]); // declared order, no empties
    expect(groups.find((g) => g.stage === "seen")!.items[0].phraseId).toBe("c");
  });

  it("excludes suppressed phrases and phrases never seen and not in deck", () => {
    const deck: DeckStore = {
      sup: entry("sup", { inDeck: true, stage: "usable", timesSeen: 4, suppressed: true }),
      untouched: entry("untouched", { inDeck: false, stage: "new", timesSeen: 0 }),
      kept: entry("kept", { inDeck: true, stage: "seen", timesSeen: 1, nextReviewAt: NOW + DAY }),
    };
    const ids = notebookGroups(deck, NOW).flatMap((g) => g.items.map((i) => i.phraseId));
    expect(ids).toEqual(["kept"]);
  });

  it("labels due vs scheduled vs unscheduled review state", () => {
    const deck: DeckStore = {
      due: entry("due", { inDeck: true, stage: "recognised", timesSeen: 2, nextReviewAt: NOW - 1000 }),
      soon: entry("soon", { inDeck: true, stage: "recognised", timesSeen: 2, nextReviewAt: NOW + DAY * 4 }),
      seenOnly: entry("seenOnly", { inDeck: false, stage: "seen", timesSeen: 1 }),
    };
    const items = notebookGroups(deck, NOW).flatMap((g) => g.items);
    const byId = Object.fromEntries(items.map((i) => [i.phraseId, i]));
    expect(byId.due.reviewState).toBe("due");
    expect(byId.due.reviewLabel).toBe("Due today");
    expect(byId.soon.reviewState).toBe("scheduled");
    expect(byId.soon.reviewLabel).not.toBe("");
    expect(byId.seenOnly.reviewState).toBe("unscheduled");
    expect(byId.seenOnly.reviewLabel).toBe("");
  });

  it("floats due items to the top within a stage", () => {
    const deck: DeckStore = {
      z: entry("z", { inDeck: true, stage: "recognised", timesSeen: 2, nextReviewAt: NOW + DAY * 9 }),
      a: entry("a", { inDeck: true, stage: "recognised", timesSeen: 2, nextReviewAt: NOW - 1000 }),
    };
    const items = notebookGroups(deck, NOW)[0].items;
    expect(items[0].phraseId).toBe("a"); // due leads even though "z" < ... no: due wins over id-sort
  });
});

describe("getStageLabel", () => {
  it("maps each stage to a human label", () => {
    const pairs: [PhraseStage, string][] = [
      ["new", "New"],
      ["seen", "Seen"],
      ["recognised", "Recognised"],
      ["recalled", "Recalled"],
      ["usable", "Usable"],
      ["mastered", "Mastered"],
    ];
    for (const [stage, label] of pairs) expect(getStageLabel(stage)).toBe(label);
  });
});

describe("addedOnCount", () => {
  it("counts deck entries added on a given local date", () => {
    const today = new Date("2026-07-09T09:00:00").getTime();
    const alsoToday = new Date("2026-07-09T22:30:00").getTime();
    const yesterday = new Date("2026-07-08T09:00:00").getTime();
    const deck: DeckStore = {
      a: entry("a", { addedToDeckAt: today }),
      b: entry("b", { addedToDeckAt: alsoToday }),
      c: entry("c", { addedToDeckAt: yesterday }),
      d: entry("d", { addedToDeckAt: null }),
    };
    expect(addedOnCount(deck, "2026-07-09")).toBe(2);
    expect(addedOnCount(deck, "2026-07-08")).toBe(1);
  });
});
