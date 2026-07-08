import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { Phrase } from "@/lib/types";
import { TypedCorrectionCard } from "@/components/exercises/TypedCorrectionCard";

afterEach(cleanup);

const phrase: Phrase = {
  id: "make-a-decision",
  text: "make a decision",
  meaningEs: "tomar una decisión",
  example: "We need to make a decision.",
  level: "B2",
  tags: [],
  category: "collocation",
  contrastWith: [{ phrase: "do a decision", explanationEs: "El verbo correcto es «make»." }],
};

describe("TypedCorrectionCard", () => {
  it("shows the wrong form and an input", () => {
    render(<TypedCorrectionCard phrase={phrase} wrongForm="do a decision" previousCorrect={null} onResult={() => {}} />);
    expect(screen.getByText("do a decision")).toBeDefined();
    expect(screen.getByTestId("typed-correction-input")).toBeDefined();
  });

  it("accepts the correct form (normalised: case / spacing / punctuation)", () => {
    const onResult = vi.fn();
    render(<TypedCorrectionCard phrase={phrase} wrongForm="do a decision" previousCorrect={null} onResult={onResult} />);
    fireEvent.change(screen.getByTestId("typed-correction-input"), { target: { value: "  Make a Decision. " } });
    fireEvent.click(screen.getByTestId("typed-correction-submit"));
    expect(onResult).toHaveBeenCalledWith(true);
    expect(screen.getByText("That's it.")).toBeDefined();
  });

  it("rejects a wrong answer and reveals the correct form", () => {
    const onResult = vi.fn();
    render(<TypedCorrectionCard phrase={phrase} wrongForm="do a decision" previousCorrect={null} onResult={onResult} />);
    fireEvent.change(screen.getByTestId("typed-correction-input"), { target: { value: "do a decision" } });
    fireEvent.click(screen.getByTestId("typed-correction-submit"));
    expect(onResult).toHaveBeenCalledWith(false);
    expect(screen.getByText("It's “make a decision”.")).toBeDefined();
  });
});
