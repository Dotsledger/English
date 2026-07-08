import type { Phrase, VocabularyCategory, CefrLevel, FrequencyBand } from "@/lib/types";

/**
 * Strategy-metadata backfill. Two parts:
 *  1. STRATEGY_ANNOTATIONS — strategy fields for phrases that ALREADY exist
 *     (the curated core life phrases). Applied in phrases.ts without touching
 *     their IDs or examples.
 *  2. phrases — high-value patterns the catalog was missing (phrasal verbs,
 *     collocations, sentence frames, discourse markers, Spanish-speaker traps,
 *     plus a few daily-life / work chunks), fully annotated.
 *
 * Together with the 24-item seed this brings Useful Patterns to ~96 items and
 * fills every Explore filter. `level` stays at the B2 floor (internal band);
 * `cefrLevel` holds the true scale. Every example contains the phrase verbatim
 * so cloze stays valid (see tests/content.test.ts).
 */

type Strategy = Pick<
  Phrase,
  | "category"
  | "cefrLevel"
  | "frequencyBand"
  | "usefulnessScore"
  | "productivePriority"
  | "isPhrasalVerb"
  | "isHighFrequencyPattern"
  | "isSpanishSpeakerTrap"
>;

/** Strategy fields for existing core life phrases (annotate, never duplicate). */
export const STRATEGY_ANNOTATIONS: Record<string, Strategy> = {
  // core chunks
  "figure-it-out": s("core_chunk", "B1", "high", 88, 86),
  "on-the-fence": s("core_chunk", "B2", "medium", 74, 72),
  "that-makes-sense": { ...s("core_chunk", "A2", "very_high", 92, 88), isHighFrequencyPattern: true },
  "didnt-see-that-coming": s("core_chunk", "B2", "medium", 76, 74),
  "depends-on-the-situation": s("core_chunk", "B1", "high", 80, 78),
  "think-it-through": s("core_chunk", "B2", "medium", 76, 76),
  "not-what-i-meant": s("core_chunk", "B1", "high", 82, 82),
  "let-me-double-check": s("core_chunk", "B1", "high", 82, 80),
  "that-sounds-fair": s("core_chunk", "B2", "medium", 74, 74),
  "take-care-of-it": s("core_chunk", "B1", "high", 84, 82),
  "not-following": s("core_chunk", "B1", "high", 80, 80),
  "up-to-you": s("core_chunk", "B1", "high", 82, 80),
  // work communication
  "dont-hesitate-to-ask": s("work_communication", "B1", "high", 80, 78),
  "step-by-step": s("work_communication", "B1", "high", 82, 80),
  "get-back-to-you": { ...s("work_communication", "B1", "very_high", 88, 86), isHighFrequencyPattern: true },
  "running-out-of-time": s("work_communication", "B1", "high", 80, 78),
  "let-me-know": { ...s("work_communication", "A2", "very_high", 86, 84), isHighFrequencyPattern: true },
  "that-works-for-me": s("work_communication", "B1", "high", 82, 82),
  // daily life
  "cant-keep-up": s("daily_life", "B1", "high", 78, 76),
  "slipped-my-mind": s("daily_life", "B2", "medium", 76, 74),
  "not-used-to-it-yet": s("daily_life", "B1", "medium", 76, 76),
  "id-rather-not": s("daily_life", "B1", "high", 82, 82),
  "messed-it-up": s("daily_life", "B1", "high", 78, 74),
  "looking-forward-to-it": s("daily_life", "B1", "high", 84, 82),
  "got-carried-away": s("daily_life", "C1", "medium", 70, 68),
  "worth-a-try": s("daily_life", "B1", "high", 80, 78),
  "cant-make-it": s("daily_life", "B1", "high", 82, 80),
  // sentence frames
  "how-to-put-it": s("sentence_frame", "B2", "medium", 78, 80),
  "get-better-at-this": s("sentence_frame", "B1", "high", 82, 84),
  "it-depends-on": { ...s("sentence_frame", "B1", "high", 84, 84), isHighFrequencyPattern: true },
  // collocation
  "take-your-time": s("collocation", "A2", "high", 82, 78),
};

function s(
  category: VocabularyCategory,
  cefrLevel: CefrLevel,
  frequencyBand: FrequencyBand,
  usefulnessScore: number,
  productivePriority: number
): Strategy {
  return { category, cefrLevel, frequencyBand, usefulnessScore, productivePriority };
}

export const phrases: Phrase[] = [
  // ── Phrasal verbs ──
  pv("find-out", "find out", "averiguar / enterarse de", "B1", "very_high", 86, 84, [
    "I need to find out what happened.",
    "Let me find out and tell you.",
  ], "Cuando quieres descubrir información que aún no tienes.", true),
  pv("set-up", "set up", "montar / configurar", "B1", "high", 84, 82, [
    "I'll set up the meeting for Monday.",
    "Can you set up the account for me?",
  ], "Preparar o configurar algo (una reunión, una cuenta).", true),
  pv("go-through", "go through", "repasar / revisar", "B1", "high", 82, 80, [
    "Let's go through the details together.",
    "We need to go through the plan once more.",
  ], "Repasar algo paso a paso."),
  pv("sort-out", "sort out", "resolver / arreglar", "B2", "high", 80, 78, [
    "I'll sort out the problem today.",
    "We need to sort out the schedule first.",
  ], "Resolver un lío o problema práctico."),
  pv("pick-up", "pick up", "recoger", "A2", "very_high", 82, 78, [
    "Can you pick up some milk on the way?",
    "I'll pick up the kids at five.",
  ], "Recoger algo o a alguien.", true),
  pv("put-off", "put off", "posponer / aplazar", "B2", "high", 78, 76, [
    "Don't put off the decision any longer.",
    "We had to put off the trip until June.",
  ], "Dejar algo para más tarde."),
  pv("end-up", "end up", "acabar (haciendo/siendo)", "B1", "high", 82, 80, [
    "We might end up staying home.",
    "You could end up paying more than you think.",
  ], "El resultado final, a menudo inesperado."),
  pv("work-out", "work out", "salir bien / resolverse", "B1", "high", 80, 78, [
    "It will work out fine in the end.",
    "Let's work out the details tomorrow.",
  ], "Que algo se resuelva o salga bien."),
  pv("show-up", "show up", "aparecer / presentarse", "B1", "high", 80, 76, [
    "He didn't show up on time.",
    "Please show up a few minutes early.",
  ], "Presentarse en un sitio."),
  pv("move-on", "move on", "pasar a otra cosa / seguir adelante", "B1", "high", 80, 78, [
    "Let's move on to the next point.",
    "It's time to move on from this.",
  ], "Dejar algo atrás y seguir."),

  // ── Collocations ──
  co("make-progress", "make progress", "avanzar / hacer progresos", "B1", "high", 82, 80, [
    "We're starting to make progress.",
    "It's hard to make progress without help.",
  ], "Avanzar hacia un objetivo."),
  co("make-an-effort", "make an effort", "hacer un esfuerzo", "B1", "high", 80, 80, [
    "Please make an effort to be on time.",
    "I'll make an effort to reply faster.",
  ], "Esforzarse por algo."),
  co("do-your-best", "do your best", "hacer lo posible", "A2", "high", 82, 80, [
    "Just do your best.",
    "You should do your best and see how it goes.",
  ], "Dar lo mejor de uno mismo."),
  co("take-a-look", "take a look", "echar un vistazo", "A2", "very_high", 86, 82, [
    "Let me take a look.",
    "Can you take a look at this for me?",
  ], "Mirar algo brevemente.", true),
  co("take-it-seriously", "take it seriously", "tomárselo en serio", "B2", "high", 78, 78, [
    "You should take it seriously.",
    "They didn't take it seriously enough.",
  ], "Dar a algo la importancia que merece."),
  co("solve-a-problem", "solve a problem", "resolver un problema", "B1", "high", 80, 78, [
    "We need to solve a problem quickly.",
    "It's hard to solve a problem like this alone.",
  ], "Encontrar solución a algo."),
  co("save-time", "save time", "ahorrar tiempo", "B1", "high", 82, 80, [
    "This will save time later.",
    "We can save time if we automate it.",
  ], "Ganar/ahorrar tiempo."),

  // ── Sentence frames ── (note: "it depends on" already exists in the catalog
  // and is annotated via STRATEGY_ANNOTATIONS rather than duplicated here)
  sf("dont-think-worth", "I don't think it's worth", "no creo que valga la pena", "B2", "high", 78, 80, [
    "I don't think it's worth the risk.",
    "Honestly, I don't think it's worth it.",
  ], "Para desaconsejar algo con tacto."),
  sf("find-it-hard-to", "I find it hard to", "me cuesta", "B1", "high", 80, 82, [
    "I find it hard to focus here.",
    "I find it hard to say no sometimes.",
  ], "Para admitir una dificultad."),
  sf("need-get-used-to", "I need to get used to", "tengo que acostumbrarme a", "B1", "medium", 76, 78, [
    "I need to get used to the new schedule.",
    "I need to get used to waking up early.",
  ], "Para hablar de adaptarse a algo nuevo."),
  sf("do-you-mind-if", "do you mind if", "¿te importa si…?", "B1", "high", 82, 84, [
    "Do you mind if I join?",
    "Do you mind if I open the window?",
  ], "Petición muy educada de permiso."),
  sf("dont-feel-like", "I don't feel like", "no me apetece", "B1", "high", 80, 80, [
    "I don't feel like cooking tonight.",
    "I don't feel like going out today.",
  ], "Para decir que algo no te apetece."),
  sf("im-supposed-to", "I'm supposed to", "se supone que tengo que", "B1", "high", 80, 82, [
    "I'm supposed to finish this today.",
    "I'm supposed to be there at nine.",
  ], "Obligación o expectativa sobre uno mismo."),

  // ── Discourse markers ──
  dm("basically", "basically", "básicamente / en resumen", "B1", "high", 78, 76, [
    "Basically, it comes down to money.",
    "It's basically the same thing.",
  ], "Para resumir o simplificar una idea."),
  dm("to-be-honest", "to be honest", "sinceramente / la verdad", "B1", "very_high", 84, 82, [
    "To be honest, I'm not sure.",
    "It was fine, to be honest.",
  ], "Para introducir una opinión franca."),
  dm("anyway", "anyway", "en fin / de todos modos", "A2", "very_high", 82, 78, [
    "Anyway, let's move on.",
    "It's late anyway.",
  ], "Para cambiar de tema o cerrar uno."),
  dm("on-the-other-hand", "on the other hand", "por otro lado", "B2", "high", 78, 76, [
    "On the other hand, it's cheaper.",
    "It's slower; on the other hand, it's safer.",
  ], "Para contrastar dos ideas."),

  // ── Spanish-speaker traps ──
  trap("married-to", "married to", "casado con", "A2", "high", 80, 76, [
    "She's married to a doctor.",
    "He's married to his job, honestly.",
  ], "La preposición correcta es «to», no «with».", "spanish_speaker_trap",
    "Es «married TO», no «married with».", "married with", "Calco de «casado con»; en inglés es «married to»."),
  trap("good-at", "good at", "bueno/a en (habilidad)", "A2", "very_high", 84, 78, [
    "She's good at math.",
    "I'm not very good at cooking.",
  ], "La preposición correcta es «at», no «in».", "spanish_speaker_trap",
    "Es «good AT something», no «good in».", "good in", "La preposición correcta para habilidades es «at»."),
  trap("listen-to", "listen to", "escuchar (algo/a alguien)", "A2", "very_high", 84, 78, [
    "I listen to music every day.",
    "You should listen to her advice.",
  ], "«Listen» lleva «to» antes del objeto.", "spanish_speaker_trap",
    "Es «listen TO something», no «listen something».", "listen music", "«Listen» necesita «to»: «listen to music»."),
  trap("eventually", "eventually", "con el tiempo / al final", "B1", "high", 82, 76, [
    "It will work eventually.",
    "Eventually, they reached an agreement.",
  ], "Falso amigo: NO significa «eventualmente».", "false_friend",
    "«Eventually» = con el tiempo / al final. «Eventualmente» → «occasionally»/«possibly».",
    "eventualmente", "Falso amigo: «eventualmente» no es «eventually»."),
  trap("assist", "assist", "ayudar (no asistir a un evento)", "B2", "medium", 72, 68, [
    "A nurse will assist the doctor.",
    "Can you assist me with this?",
  ], "Falso amigo: «assist» = ayudar, no «asistir a».", "false_friend",
    "«Assist» = ayudar. «Asistir (a un evento)» = «attend».",
    "assist to the meeting", "«Asistir a» se dice «attend», no «assist to»."),
  trap("sensible", "sensible", "sensato / con sentido común", "B2", "medium", 72, 68, [
    "That's a sensible decision.",
    "Let's be sensible about the budget.",
  ], "Falso amigo: «sensible» = sensato, no «sensible».", "false_friend",
    "«Sensible» = sensato. «Sensible (emocional)» = «sensitive».",
    "sensible person (emotional)", "Para «sensible/emotivo» usa «sensitive»."),

  // ── Daily life ──
  {
    id: "im-on-my-way",
    text: "I'm on my way",
    meaningEs: "voy de camino / ya voy",
    example: "I'm on my way.",
    examples: ["Sorry, I'm on my way now."],
    level: "B2",
    tags: ["daily"],
    usageContext: "Para avisar de que ya vas hacia un sitio.",
    difficulty: "easy",
    category: "daily_life",
    cefrLevel: "A2",
    frequencyBand: "very_high",
    usefulnessScore: 84,
    productivePriority: 80,
  },
  {
    id: "im-running-late",
    text: "I'm running late",
    meaningEs: "voy con retraso",
    example: "I'm running late, start without me.",
    examples: ["Traffic is bad and I'm running late."],
    level: "B2",
    tags: ["daily"],
    usageContext: "Para avisar de que llegarás tarde.",
    difficulty: "easy",
    category: "daily_life",
    cefrLevel: "A2",
    frequencyBand: "very_high",
    usefulnessScore: 84,
    productivePriority: 80,
  },

  // ── Work communication ──
  work("lets-align", "let's align on this", "pongámonos de acuerdo en esto", "B2", "high", 80, 82, [
    "Let's align on this before the call.",
    "First, let's align on this.",
  ], "Para acordar un enfoque común en el trabajo."),
  work("can-you-clarify", "can you clarify", "¿puedes aclarar?", "B1", "high", 82, 82, [
    "Can you clarify what you mean?",
    "Sorry, can you clarify the deadline?",
  ], "Para pedir una aclaración con educación."),
  work("ill-follow-up", "I'll follow up", "haré seguimiento", "B1", "high", 84, 82, [
    "I'll follow up with them tomorrow.",
    "Thanks — I'll follow up by email.",
  ], "Para comprometerte a retomar un tema."),
  work("move-forward", "move this forward", "avanzar con esto", "B2", "high", 80, 80, [
    "Can we move this forward?",
    "Let's move this forward this week.",
  ], "Para impulsar que algo avance."),
  work("fair-point", "that's a fair point", "es un buen argumento", "B2", "high", 80, 78, [
    "That's a fair point.",
    "Honestly, that's a fair point.",
  ], "Para reconocer el argumento de otro."),
  work("keep-you-posted", "I'll keep you posted", "te mantendré al tanto", "B1", "high", 82, 80, [
    "I'll keep you posted.",
    "No news yet, but I'll keep you posted.",
  ], "Para prometer que darás novedades."),
];

// ── Small constructors to keep the 42 items consistent and terse ──

function base(
  id: string,
  text: string,
  meaningEs: string,
  cefrLevel: CefrLevel,
  frequencyBand: FrequencyBand,
  usefulnessScore: number,
  productivePriority: number,
  examples: string[],
  usageContext: string,
  category: VocabularyCategory,
  tags: string[]
): Phrase {
  return {
    id,
    text,
    meaningEs,
    example: examples[0],
    examples: examples.slice(1),
    level: "B2",
    tags,
    usageContext,
    difficulty: "medium",
    category,
    cefrLevel,
    frequencyBand,
    usefulnessScore,
    productivePriority,
  };
}

function pv(
  id: string, text: string, meaningEs: string, cefr: CefrLevel, freq: FrequencyBand,
  useful: number, prod: number, examples: string[], usageContext: string, highFreq = false
): Phrase {
  return {
    ...base(id, text, meaningEs, cefr, freq, useful, prod, examples, usageContext, "phrasal_verb", ["verb"]),
    isPhrasalVerb: true,
    ...(highFreq ? { isHighFrequencyPattern: true } : {}),
  };
}

function co(
  id: string, text: string, meaningEs: string, cefr: CefrLevel, freq: FrequencyBand,
  useful: number, prod: number, examples: string[], usageContext: string, highFreq = false
): Phrase {
  return {
    ...base(id, text, meaningEs, cefr, freq, useful, prod, examples, usageContext, "collocation", ["collocation"]),
    ...(highFreq ? { isHighFrequencyPattern: true } : {}),
  };
}

function sf(
  id: string, text: string, meaningEs: string, cefr: CefrLevel, freq: FrequencyBand,
  useful: number, prod: number, examples: string[], usageContext: string
): Phrase {
  return {
    ...base(id, text, meaningEs, cefr, freq, useful, prod, examples, usageContext, "sentence_frame", ["frame"]),
    isHighFrequencyPattern: true,
  };
}

function dm(
  id: string, text: string, meaningEs: string, cefr: CefrLevel, freq: FrequencyBand,
  useful: number, prod: number, examples: string[], usageContext: string
): Phrase {
  return base(id, text, meaningEs, cefr, freq, useful, prod, examples, usageContext, "discourse_marker", ["fluency", "marker"]);
}

function work(
  id: string, text: string, meaningEs: string, cefr: CefrLevel, freq: FrequencyBand,
  useful: number, prod: number, examples: string[], usageContext: string
): Phrase {
  return base(id, text, meaningEs, cefr, freq, useful, prod, examples, usageContext, "work_communication", ["work"]);
}

function trap(
  id: string, text: string, meaningEs: string, cefr: CefrLevel, freq: FrequencyBand,
  useful: number, prod: number, examples: string[], usageContext: string,
  category: VocabularyCategory, avoid: string, contrastPhrase: string, contrastEs: string
): Phrase {
  return {
    ...base(id, text, meaningEs, cefr, freq, useful, prod, examples, usageContext, category, ["trap"]),
    difficulty: "easy",
    isSpanishSpeakerTrap: true,
    avoid,
    contrastWith: [{ phrase: contrastPhrase, explanationEs: contrastEs }],
  };
}
