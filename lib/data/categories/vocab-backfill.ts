import type { Phrase, VocabularyCategory, CefrLevel, FrequencyBand } from "@/lib/types";

/**
 * Strategy-metadata backfill + depth. Two parts:
 *  1. STRATEGY_ANNOTATIONS — strategy fields (and, for some, extra learning
 *     depth: situations / avoid / contrastWith) for phrases that ALREADY exist
 *     (the core life phrases, the strategy seed, and one catalog phrase).
 *     Applied by id in phrases.ts without touching their text/examples/ids.
 *  2. phrases — high-value patterns the catalog was missing, each now fully
 *     enriched: phrasal verbs and sentence frames carry ≥2 realistic
 *     situations, collocations carry an `avoid`, work/daily items carry
 *     situations, traps carry avoid + contrastWith.
 *
 * A good situation is a realistic scenario that forces retrieval, never a
 * definition. `level` stays at the B2 floor; `cefrLevel` holds the true scale.
 * Every example contains the phrase verbatim so cloze stays valid.
 */

type Annotation = Pick<
  Phrase,
  "category" | "cefrLevel" | "frequencyBand" | "usefulnessScore" | "productivePriority"
> &
  Partial<
    Pick<
      Phrase,
      | "isPhrasalVerb"
      | "isHighFrequencyPattern"
      | "isSpanishSpeakerTrap"
      | "situations"
      | "avoid"
      | "contrastWith"
    >
  >;

function s(
  category: VocabularyCategory,
  cefrLevel: CefrLevel,
  frequencyBand: FrequencyBand,
  usefulnessScore: number,
  productivePriority: number
): Annotation {
  return { category, cefrLevel, frequencyBand, usefulnessScore, productivePriority };
}

/**
 * Annotations for existing phrases. Strategy fields for all; extra depth
 * (situations / avoid / contrastWith) where the base phrase was too shallow to
 * drive Situation / Contrast cards. Providing `situations` here replaces the
 * base phrase's array by design (used to top up 1 → 2 on seed items).
 */
export const STRATEGY_ANNOTATIONS: Record<string, Annotation> = {
  // ── core chunks (strategy only; already rich) ──
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
  // ── work communication (already have situations) ──
  "dont-hesitate-to-ask": s("work_communication", "B1", "high", 80, 78),
  "step-by-step": s("work_communication", "B1", "high", 82, 80),
  "get-back-to-you": { ...s("work_communication", "B1", "very_high", 88, 86), isHighFrequencyPattern: true },
  "running-out-of-time": s("work_communication", "B1", "high", 80, 78),
  "let-me-know": { ...s("work_communication", "A2", "very_high", 86, 84), isHighFrequencyPattern: true },
  "that-works-for-me": s("work_communication", "B1", "high", 82, 82),
  // ── daily life (already have situations) ──
  "cant-keep-up": s("daily_life", "B1", "high", 78, 76),
  "slipped-my-mind": s("daily_life", "B2", "medium", 76, 74),
  "not-used-to-it-yet": s("daily_life", "B1", "medium", 76, 76),
  "id-rather-not": s("daily_life", "B1", "high", 82, 82),
  "messed-it-up": s("daily_life", "B1", "high", 78, 74),
  "looking-forward-to-it": s("daily_life", "B1", "high", 84, 82),
  "got-carried-away": s("daily_life", "C1", "medium", 70, 68),
  "worth-a-try": s("daily_life", "B1", "high", 80, 78),
  "cant-make-it": s("daily_life", "B1", "high", 82, 80),
  // ── sentence frames (core two already have 2 situations) ──
  "how-to-put-it": s("sentence_frame", "B2", "medium", 78, 80),
  "get-better-at-this": s("sentence_frame", "B1", "high", 82, 84),
  "it-depends-on": {
    ...s("sentence_frame", "B1", "high", 84, 84),
    isHighFrequencyPattern: true,
    situations: [
      "Te piden una regla fija, pero la respuesta cambia según el caso.",
      "Alguien quiere un sí o un no rotundo y prefieres responder con matices.",
    ],
  },
  // ── collocation (core; add the avoid it lacked) ──
  "take-your-time": {
    ...s("collocation", "A2", "high", 82, 78),
    avoid: "«Take your time» = sin prisa; no lo confundas con «have time» (tener tiempo).",
  },
  // ── seed phrasal verbs: top up 1 → 2 realistic situations ──
  "look-into": {
    ...s("phrasal_verb", "B1", "high", 82, 80),
    isPhrasalVerb: true,
    situations: [
      "Un compañero reporta un fallo y te ofreces a investigarlo.",
      "Un cliente pregunta por un cobro raro y dices que lo mirarás.",
    ],
  },
  "bring-up": {
    ...s("phrasal_verb", "B2", "high", 80, 82),
    isPhrasalVerb: true,
    situations: [
      "Quieres mencionar un tema incómodo en una reunión.",
      "Nadie saca un asunto pendiente y decides plantearlo tú.",
    ],
  },
  "come-up-with": {
    ...s("phrasal_verb", "B2", "high", 83, 84),
    isPhrasalVerb: true,
    situations: [
      "El equipo necesita una solución nueva y buscáis ideas.",
      "Te piden un nombre mejor para el proyecto y propones uno.",
    ],
  },
  "deal-with": {
    ...s("phrasal_verb", "B1", "very_high", 88, 86),
    isPhrasalVerb: true,
    isHighFrequencyPattern: true,
    situations: [
      "Tranquilizas a alguien diciendo que tú te ocupas del problema.",
      "Tienes demasiados correos y explicas que no das abasto con todo.",
    ],
  },
  "run-out-of": {
    ...s("phrasal_verb", "B1", "high", 79, 78),
    isPhrasalVerb: true,
    situations: [
      "Notas que algo se está agotando en casa y avisas.",
      "Antes de una llamada larga, avisas de que te queda poca batería.",
    ],
  },
  "turn-out": {
    ...s("phrasal_verb", "B2", "high", 78, 76),
    isPhrasalVerb: true,
    situations: [
      "Cuentas cómo terminó algo que no salió como esperabas.",
      "Comentas que al final algo salió más barato de lo previsto.",
    ],
    contrastWith: [
      { phrase: "turn off", explanationEs: "«Turn out» = resultar; «turn off» = apagar. No los confundas." },
    ],
  },
  // ── seed sentence frames: top up 1 → 2 situations ──
  "was-wondering": {
    ...s("sentence_frame", "B1", "high", 90, 92),
    isHighFrequencyPattern: true,
    situations: [
      "Quieres pedirle un favor a tu jefe sin sonar brusco.",
      "Necesitas cambiar la hora de una cita y lo pides con mucha educación.",
    ],
  },
  "problem-is-that": {
    ...s("sentence_frame", "B1", "high", 86, 84),
    isHighFrequencyPattern: true,
    situations: [
      "Explicas en una reunión por qué algo no va a salir a tiempo.",
      "Señalas con claridad cuál es el obstáculo real de un plan.",
    ],
  },
  "what-i-mean": {
    ...s("sentence_frame", "B1", "high", 84, 85),
    situations: [
      "Alguien te malinterpreta y quieres aclarar lo que querías decir.",
      "Te has explicado fatal y reformulas la idea desde cero.",
    ],
  },
  // ── seed collocations: add the avoid they lacked ──
  "meet-a-deadline": {
    ...s("collocation", "B2", "high", 80, 78),
    avoid: "Se dice «meet a deadline» (cumplir un plazo), no «complete/comply a deadline».",
  },
  "raise-a-concern": {
    ...s("collocation", "B2", "medium", 74, 76),
    avoid: "Se dice «raise a concern» (plantear una duda), no «say a concern».",
  },
  "take-responsibility": {
    ...s("collocation", "B2", "medium", 76, 74),
    avoid: "Para «asumir», es «take responsibility», no «have responsibility».",
  },
  "waste-time": {
    ...s("collocation", "B1", "high", 82, 80),
    avoid: "Se dice «waste time» (perder el tiempo), no «lose time» en este sentido.",
  },
};

// ── New items the catalog lacked (fully enriched) ──

export const phrases: Phrase[] = [
  // ── Phrasal verbs (≥2 situations each) ──
  pv("find-out", "find out", "averiguar / enterarse de", "B1", "very_high", 86, 84,
    ["I need to find out what happened.", "Let me find out and tell you."],
    "Descubrir información que aún no tienes.",
    ["No sabes por qué se canceló la reunión y quieres enterarte.",
     "Un cliente pregunta un dato que no tienes a mano; dices que lo averiguarás."],
    { highFreq: true }),
  pv("set-up", "set up", "montar / configurar", "B1", "high", 84, 82,
    ["I'll set up the meeting for Monday.", "Can you set up the account for me?"],
    "Preparar o configurar algo (una reunión, una cuenta).",
    ["Tienes que preparar una videollamada para mañana con el equipo.",
     "Un compañero nuevo necesita que le configures el acceso al sistema."],
    { highFreq: true }),
  pv("go-through", "go through", "repasar / revisar", "B1", "high", 82, 80,
    ["Let's go through the details together.", "We need to go through the plan once more."],
    "Repasar algo punto por punto.",
    ["Antes de enviar el informe, quieres repasarlo con un compañero.",
     "Un cliente no entiende el contrato y le propones revisarlo juntos."]),
  pv("sort-out", "sort out", "resolver / arreglar", "B2", "high", 80, 78,
    ["I'll sort out the problem today.", "We need to sort out the schedule first."],
    "Resolver un lío o problema práctico.",
    ["Hay un lío con las facturas y te ofreces a arreglarlo hoy.",
     "El horario del equipo está desordenado y hay que resolverlo antes del lunes."]),
  pv("pick-up", "pick up", "recoger", "A2", "very_high", 82, 78,
    ["Can you pick up some milk on the way?", "I'll pick up the kids at five."],
    "Recoger algo o a alguien.",
    ["Vas al supermercado y tu pareja te pide traer algo de camino.",
     "Quedas en recoger a un amigo en la estación por la tarde."],
    { highFreq: true }),
  pv("put-off", "put off", "posponer / aplazar", "B2", "high", 78, 76,
    ["Don't put off the decision any longer.", "We had to put off the trip until June."],
    "Dejar algo para más tarde.",
    ["No estás listo para decidir y quieres aplazar la reunión.",
     "El mal tiempo te obliga a posponer el viaje de fin de semana."]),
  pv("end-up", "end up", "acabar (haciendo/siendo)", "B1", "high", 82, 80,
    ["We might end up staying home.", "You could end up paying more than you think."],
    "El resultado final, a menudo inesperado.",
    ["Un plan cambia sobre la marcha y acabas haciendo algo distinto.",
     "Adviertes a alguien de que, si no compara, acabará pagando de más."],
    { contrast: { phrase: "finish", explanationEs: "«End up» = acabar (a menudo sin planearlo); no es «finish» (terminar una tarea)." } }),
  pv("work-out", "work out", "salir bien / resolverse", "B1", "high", 80, 78,
    ["It will work out fine in the end.", "Let's work out the details tomorrow."],
    "Que algo se resuelva o salga bien.",
    ["Alguien está preocupado y le tranquilizas diciendo que todo saldrá bien.",
     "Proponéis dejar para mañana el resolver los últimos detalles."],
    { contrast: { phrase: "work out (exercise)", explanationEs: "«Work out» también significa hacer ejercicio; aquí es 'resolverse/salir bien'." } }),
  pv("show-up", "show up", "aparecer / presentarse", "B1", "high", 80, 76,
    ["He didn't show up on time.", "Please show up a few minutes early."],
    "Presentarse en un sitio.",
    ["Un compañero no apareció a la reunión y lo comentas.",
     "Pides a alguien que llegue unos minutos antes al evento."]),
  pv("move-on", "move on", "pasar a otra cosa / seguir adelante", "B1", "high", 80, 78,
    ["Let's move on to the next point.", "It's time to move on from this."],
    "Dejar algo atrás y seguir.",
    ["En una reunión ya habéis agotado un punto y quieres pasar al siguiente.",
     "Un tema del pasado sigue rondando y animas a alguien a seguir adelante."]),

  // ── Collocations (each with an `avoid`) ──
  co("make-progress", "make progress", "avanzar / hacer progresos", "B1", "high", 82, 80,
    ["We're starting to make progress.", "It's hard to make progress without help."],
    "Avanzar hacia un objetivo.",
    "Se dice «make progress», no «do progress»."),
  co("make-an-effort", "make an effort", "hacer un esfuerzo", "B1", "high", 80, 80,
    ["Please make an effort to be on time.", "I'll make an effort to reply faster."],
    "Esforzarse por algo.",
    "Se dice «make an effort», no «do an effort»."),
  co("do-your-best", "do your best", "hacer lo posible", "A2", "high", 82, 80,
    ["Just do your best.", "You should do your best and see how it goes."],
    "Dar lo mejor de uno mismo.",
    "Se dice «do your best» (con DO), aunque una decisión sea «make a decision» (con MAKE)."),
  co("take-a-look", "take a look", "echar un vistazo", "A2", "very_high", 86, 82,
    ["Let me take a look.", "Can you take a look at this for me?"],
    "Mirar algo brevemente.",
    "Se dice «take a look», no «give a look» en este sentido.",
    { highFreq: true }),
  co("take-it-seriously", "take it seriously", "tomárselo en serio", "B2", "high", 78, 78,
    ["You should take it seriously.", "They didn't take it seriously enough."],
    "Dar a algo la importancia que merece.",
    "Se dice «take it seriously», no «take it in serious»."),
  co("solve-a-problem", "solve a problem", "resolver un problema", "B1", "high", 80, 78,
    ["We need to solve a problem quickly.", "It's hard to solve a problem like this alone."],
    "Encontrar solución a algo.",
    "El verbo natural es «solve a problem» (o «fix»), no «make a problem» para 'resolver'."),
  co("save-time", "save time", "ahorrar tiempo", "B1", "high", 82, 80,
    ["This will save time later.", "We can save time if we automate it."],
    "Ganar/ahorrar tiempo.",
    "Se dice «save time», no «win time» (calco de 'ganar tiempo')."),

  // ── Sentence frames (≥2 production-oriented situations) ──
  sf("dont-think-worth", "I don't think it's worth", "no creo que valga la pena", "B2", "high", 78, 80,
    ["I don't think it's worth the risk.", "Honestly, I don't think it's worth it."],
    "Para desaconsejar algo con tacto.",
    ["Alguien propone una compra cara y crees que no compensa.",
     "En el trabajo desaconsejas una tarea que dará muy poco resultado."]),
  sf("find-it-hard-to", "I find it hard to", "me cuesta", "B1", "high", 80, 82,
    ["I find it hard to focus here.", "I find it hard to say no sometimes."],
    "Para admitir una dificultad.",
    ["Admites que te cuesta concentrarte en una oficina ruidosa.",
     "Reconoces que te cuesta decir que no a la gente."]),
  sf("need-get-used-to", "I need to get used to", "tengo que acostumbrarme a", "B1", "medium", 76, 78,
    ["I need to get used to the new schedule.", "I need to get used to waking up early."],
    "Para hablar de adaptarse a algo nuevo.",
    ["Cambiaste de horario hace poco y aún te estás adaptando.",
     "Empezaste a teletrabajar y comentas que todavía te acostumbras."]),
  sf("do-you-mind-if", "do you mind if", "¿te importa si…?", "B1", "high", 82, 84,
    ["Do you mind if I join?", "Do you mind if I open the window?"],
    "Petición muy educada de permiso.",
    ["Quieres unirte a una conversación y pides permiso con educación.",
     "Hace calor en la sala y pides permiso para abrir la ventana."]),
  sf("dont-feel-like", "I don't feel like", "no me apetece", "B1", "high", 80, 80,
    ["I don't feel like cooking tonight.", "I don't feel like going out today."],
    "Para decir que algo no te apetece.",
    ["Un amigo propone salir y esta noche no te apetece nada.",
     "Estás cansado tras el trabajo y no te apetece cocinar."]),
  sf("im-supposed-to", "I'm supposed to", "se supone que tengo que", "B1", "high", 80, 82,
    ["I'm supposed to finish this today.", "I'm supposed to be there at nine."],
    "Obligación o expectativa sobre uno mismo.",
    ["Explicas que se espera que termines algo hoy sin falta.",
     "Recuerdas que tenías que estar en un sitio a una hora concreta."]),

  // ── Discourse markers (pragmatic usage context) ──
  dm("basically", "basically", "básicamente / en resumen", "B1", "high", 78, 76,
    ["Basically, it comes down to money.", "It's basically the same thing."],
    "Marcador para resumir o simplificar una idea antes de explicarla."),
  dm("to-be-honest", "to be honest", "sinceramente / la verdad", "B1", "very_high", 84, 82,
    ["To be honest, I'm not sure.", "It was fine, to be honest."],
    "Marcador que anticipa una opinión franca o algo un poco delicado."),
  dm("anyway", "anyway", "en fin / de todos modos", "A2", "very_high", 82, 78,
    ["Anyway, let's move on.", "It's late anyway."],
    "Marcador para cambiar de tema o cerrar uno con naturalidad."),
  dm("on-the-other-hand", "on the other hand", "por otro lado", "B2", "high", 78, 76,
    ["On the other hand, it's cheaper.", "It's slower; on the other hand, it's safer."],
    "Marcador para introducir el otro lado de un argumento."),

  // ── Spanish-speaker traps (avoid + contrastWith) ──
  trap("married-to", "married to", "casado con", "A2", "high", 80, 76,
    ["She's married to a doctor.", "He's married to his job, honestly."],
    "La preposición correcta es «to», no «with».", "spanish_speaker_trap",
    "Es «married TO», no «married with».", "married with", "Calco de «casado con»; en inglés es «married to»."),
  trap("good-at", "good at", "bueno/a en (habilidad)", "A2", "very_high", 84, 78,
    ["She's good at math.", "I'm not very good at cooking."],
    "La preposición correcta es «at», no «in».", "spanish_speaker_trap",
    "Es «good AT something», no «good in».", "good in", "La preposición para habilidades es «at»: «good at»."),
  trap("listen-to", "listen to", "escuchar (algo/a alguien)", "A2", "very_high", 84, 78,
    ["I listen to music every day.", "You should listen to her advice."],
    "«Listen» lleva «to» antes del objeto.", "spanish_speaker_trap",
    "Es «listen TO something», no «listen something».", "listen music", "«Listen» necesita «to»: «listen to music»."),
  trap("eventually", "eventually", "con el tiempo / al final", "B1", "high", 82, 76,
    ["It will work eventually.", "Eventually, they reached an agreement."],
    "Falso amigo: NO significa «eventualmente».", "false_friend",
    "«Eventually» = con el tiempo / al final. «Eventualmente» → «occasionally»/«possibly».",
    "eventualmente", "Falso amigo: «eventualmente» no es «eventually»."),
  trap("assist", "assist", "ayudar (no asistir a un evento)", "B2", "medium", 72, 68,
    ["A nurse will assist the doctor.", "Can you assist me with this?"],
    "Falso amigo: «assist» = ayudar, no «asistir a».", "false_friend",
    "«Assist» = ayudar. «Asistir (a un evento)» = «attend».",
    "assist to the meeting", "«Asistir a» se dice «attend», no «assist to»."),
  trap("sensible", "sensible", "sensato / con sentido común", "B2", "medium", 72, 68,
    ["That's a sensible decision.", "Let's be sensible about the budget."],
    "Falso amigo: «sensible» = sensato, no «sensible».", "false_friend",
    "«Sensible» = sensato. «Sensible (emocional)» = «sensitive».",
    "sensible person (emotional)", "Para «sensible/emotivo» usa «sensitive»."),

  // ── Daily life (ordinary real-life situations) ──
  {
    id: "im-on-my-way",
    text: "I'm on my way",
    meaningEs: "voy de camino / ya voy",
    example: "I'm on my way.",
    examples: ["Sorry, I'm on my way now."],
    level: "B2",
    tags: ["daily"],
    usageContext: "Para avisar de que ya vas hacia un sitio.",
    situations: [
      "Vas con el tiempo justo y avisas de que ya sales hacia allí.",
      "Te escriben preguntando dónde estás y respondes que ya vas.",
    ],
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
    situations: [
      "El tráfico está fatal y avisas de que vas a llegar tarde.",
      "Se te ha hecho tarde y pides que empiecen sin ti.",
    ],
    difficulty: "easy",
    category: "daily_life",
    cefrLevel: "A2",
    frequencyBand: "very_high",
    usefulnessScore: 84,
    productivePriority: 80,
  },

  // ── Work communication (realistic workplace situations) ──
  work("lets-align", "let's align on this", "pongámonos de acuerdo en esto", "B2", "high", 80, 82,
    ["Let's align on this before the call.", "First, let's align on this."],
    "Para acordar un enfoque común antes de actuar.",
    ["Antes de una llamada con cliente, quieres que el equipo acuerde un mensaje común."]),
  work("can-you-clarify", "can you clarify", "¿puedes aclarar?", "B1", "high", 82, 82,
    ["Can you clarify what you mean?", "Sorry, can you clarify the deadline?"],
    "Para pedir una aclaración con educación.",
    ["No entiendes bien una instrucción del jefe y pides que la aclare."]),
  work("ill-follow-up", "I'll follow up", "haré seguimiento", "B1", "high", 84, 82,
    ["I'll follow up with them tomorrow.", "Thanks — I'll follow up by email."],
    "Para comprometerte a retomar un tema.",
    ["Tras una reunión, te comprometes a retomar un asunto con otro equipo."]),
  work("move-forward", "move this forward", "avanzar con esto", "B2", "high", 80, 80,
    ["Can we move this forward?", "Let's move this forward this week."],
    "Para impulsar que algo avance.",
    ["Un proyecto lleva días parado y propones desbloquearlo en la reunión."]),
  work("fair-point", "that's a fair point", "es un buen argumento", "B2", "high", 80, 78,
    ["That's a fair point.", "Honestly, that's a fair point."],
    "Para reconocer el argumento de otro aunque discrepes.",
    ["Un compañero te rebate en una discusión y reconoces que tiene razón."]),
  work("keep-you-posted", "I'll keep you posted", "te mantendré al tanto", "B1", "high", 82, 80,
    ["I'll keep you posted.", "No news yet, but I'll keep you posted."],
    "Para prometer que darás novedades cuando las haya.",
    ["Aún no hay novedades de un tema pero prometes avisar en cuanto las haya."]),
];

// ── Constructors (keep the 40+ items consistent and terse) ──

function base(
  id: string, text: string, meaningEs: string, cefrLevel: CefrLevel, frequencyBand: FrequencyBand,
  usefulnessScore: number, productivePriority: number, examples: string[], usageContext: string,
  category: VocabularyCategory, tags: string[], situations?: string[]
): Phrase {
  return {
    id, text, meaningEs,
    example: examples[0],
    examples: examples.slice(1),
    level: "B2",
    tags,
    usageContext,
    ...(situations ? { situations } : {}),
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
  useful: number, prod: number, examples: string[], usageContext: string, situations: string[],
  opts: { highFreq?: boolean; contrast?: { phrase: string; explanationEs: string } } = {}
): Phrase {
  return {
    ...base(id, text, meaningEs, cefr, freq, useful, prod, examples, usageContext, "phrasal_verb", ["verb"], situations),
    isPhrasalVerb: true,
    ...(opts.highFreq ? { isHighFrequencyPattern: true } : {}),
    ...(opts.contrast ? { contrastWith: [opts.contrast] } : {}),
  };
}

function co(
  id: string, text: string, meaningEs: string, cefr: CefrLevel, freq: FrequencyBand,
  useful: number, prod: number, examples: string[], usageContext: string, avoid: string,
  opts: { highFreq?: boolean } = {}
): Phrase {
  return {
    ...base(id, text, meaningEs, cefr, freq, useful, prod, examples, usageContext, "collocation", ["collocation"]),
    avoid,
    ...(opts.highFreq ? { isHighFrequencyPattern: true } : {}),
  };
}

function sf(
  id: string, text: string, meaningEs: string, cefr: CefrLevel, freq: FrequencyBand,
  useful: number, prod: number, examples: string[], usageContext: string, situations: string[]
): Phrase {
  return {
    ...base(id, text, meaningEs, cefr, freq, useful, prod, examples, usageContext, "sentence_frame", ["frame"], situations),
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
  useful: number, prod: number, examples: string[], usageContext: string, situations: string[]
): Phrase {
  return base(id, text, meaningEs, cefr, freq, useful, prod, examples, usageContext, "work_communication", ["work"], situations);
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
