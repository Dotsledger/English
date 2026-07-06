import { describe, it, expect } from "vitest";
import { matchesSpokenTarget } from "@/lib/exercises/grade";

describe("matchesSpokenTarget", () => {
  const accepted = ["not worth it"];

  it("matches the exact phrase", () => {
    expect(matchesSpokenTarget("not worth it", accepted)).toBe(true);
  });

  it("matches the phrase embedded in a longer utterance", () => {
    expect(matchesSpokenTarget("honestly it's not worth it at all", accepted)).toBe(true);
  });

  it("tolerates recogniser noise up to the 80% threshold", () => {
    // "not worth it" → 3 tokens, need ceil(3*0.8)=3; one typo per token still ok
    expect(matchesSpokenTarget("not worthh it", accepted)).toBe(true);
  });

  it("ignores case and punctuation", () => {
    expect(matchesSpokenTarget("Not, worth it.", accepted)).toBe(true);
  });

  it("matches an accepted variant", () => {
    expect(matchesSpokenTarget("she cuts corners again", ["cut corners", "cuts corners"])).toBe(
      true
    );
  });

  it("matches a single-token target appearing anywhere", () => {
    expect(matchesSpokenTarget("that is a total scapegoat honestly", ["scapegoat"])).toBe(true);
  });

  it("rejects an unrelated utterance", () => {
    expect(matchesSpokenTarget("completely different words here", accepted)).toBe(false);
  });

  it("rejects empty input", () => {
    expect(matchesSpokenTarget("", accepted)).toBe(false);
    expect(matchesSpokenTarget("   ", accepted)).toBe(false);
  });
});
