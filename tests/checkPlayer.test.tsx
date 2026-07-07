import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CheckPlayer } from "@/components/CheckPlayer";
import type { CheckItem } from "@/lib/checkSession";

beforeEach(cleanup);

const mcq = (phraseId: string, correctIndex: number, source: CheckItem["source"]): CheckItem => ({
  id: `i-${phraseId}`,
  source,
  exercise: { type: "mcq", phraseId, prompt: `prompt ${phraseId}`, options: ["a", "b", "c"], correctIndex },
});

/** Answers the current MCQ by option index, then advances. */
function answerAndAdvance(optionIndex: number) {
  const label = ["a", "b", "c"][optionIndex];
  fireEvent.click(screen.getByText(label));
  fireEvent.click(screen.getByTestId("check-next"));
}

describe("CheckPlayer scoring (Fix 2)", () => {
  it("scores CORE only and reports stretch-correct separately", () => {
    const onComplete = vi.fn();
    // 2 core (1 right, 1 wrong) + 1 stretch (right).
    const items = [
      mcq("p1", 0, "retention"),
      mcq("p2", 1, "production"),
      mcq("p3", 2, "stretch"),
    ];
    render(<CheckPlayer items={items} onComplete={onComplete} />);

    answerAndAdvance(0); // p1 retention → correct
    answerAndAdvance(0); // p2 production → WRONG (correct was 1)
    answerAndAdvance(2); // p3 stretch → correct

    // Core = 1/2 = 50%; a wrong stretch would NOT appear here, a right one is separate.
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(50, 1);
  });

  it("a wrong stretch item never lowers the core score", () => {
    const onComplete = vi.fn();
    const items = [mcq("p1", 0, "retention"), mcq("p2", 1, "stretch")];
    render(<CheckPlayer items={items} onComplete={onComplete} />);

    answerAndAdvance(0); // core correct
    answerAndAdvance(0); // stretch WRONG (correct was 1)

    expect(onComplete).toHaveBeenCalledWith(100, 0); // core 1/1 = 100, stretch 0 correct
  });

  it("shows an 'Extra' badge on stretch items only", () => {
    const onComplete = vi.fn();
    const items = [mcq("p1", 0, "retention"), mcq("p2", 0, "stretch")];
    render(<CheckPlayer items={items} onComplete={onComplete} />);

    expect(screen.queryByTestId("mcq-badge")).toBeNull(); // core item: no badge
    answerAndAdvance(0);
    expect(screen.getByTestId("mcq-badge").textContent).toBe("🎯 Extra"); // stretch item
  });
});
