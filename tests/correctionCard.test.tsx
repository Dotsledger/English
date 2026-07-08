import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(cleanup);
import type { Phrase } from "@/lib/types";
import { ContrastCard } from "@/components/exercises/ContrastCard";

const makePhrase = (over: Partial<Phrase> = {}): Phrase => ({
  id: "make-a-decision",
  text: "make a decision",
  meaningEs: "tomar una decisión",
  example: "We need to make a decision.",
  level: "B2",
  tags: [],
  category: "collocation",
  contrastWith: [{ phrase: "do a decision", explanationEs: "El verbo correcto es «make»." }],
  ...over,
});

describe("ContrastCard — correction mode", () => {
  it("renders the wrong form and the correct phrase with a natural-English prompt", () => {
    render(<ContrastCard phrase={makePhrase()} mode="correction" selectedText={null} onSelect={() => {}} />);
    expect(screen.getByText("Which is natural English?")).toBeDefined();
    expect(screen.getByText("make a decision")).toBeDefined(); // correct
    expect(screen.getByText("do a decision")).toBeDefined(); // wrong form from contrastWith
  });

  it("reports correct when the natural form is chosen", () => {
    const onSelect = vi.fn();
    render(<ContrastCard phrase={makePhrase()} mode="correction" selectedText={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("make a decision"));
    expect(onSelect).toHaveBeenCalledWith(true);
  });

  it("can source the wrong form from an avoid array when there is no contrastWith", () => {
    const phrase = makePhrase({ contrastWith: undefined, avoid: ["do a decision"] });
    render(<ContrastCard phrase={phrase} mode="correction" selectedText={null} onSelect={() => {}} />);
    expect(screen.getByText("do a decision")).toBeDefined();
  });

  it("still works in contrast mode with the meaning-led prompt", () => {
    render(<ContrastCard phrase={makePhrase()} mode="contrast" selectedText={null} onSelect={() => {}} />);
    expect(screen.getByText(/which one\?/i)).toBeDefined();
  });
});
