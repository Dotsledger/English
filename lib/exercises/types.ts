export type McqExercise = {
  type: "mcq";
  phraseId: string;
  /** ES→EN recognition: the Spanish meaning. Checkpoint: the example with a blank. */
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type ClozeExercise = {
  type: "cloze";
  phraseId: string;
  before: string;
  after: string;
  /** First letter of the blanked text. */
  hint: string;
  /** The exact substring blanked (may be a variant, original casing). */
  answer: string;
  acceptedAnswers: string[];
};

export type FreeTypeExercise = {
  type: "freetype";
  phraseId: string;
  promptEs: string;
  acceptedAnswers: string[];
};

export type Exercise = McqExercise | ClozeExercise | FreeTypeExercise;
