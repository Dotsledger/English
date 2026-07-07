# Sticky English — Auditoría del estado real (código en `master`, 2026-07-07)

Este documento describe **lo que el código hace hoy**, extraído literalmente del
repositorio. No refleja specs ni intenciones previas salvo donde se señala una
**discrepancia** explícita. Valores y textos citados son exactos.

App: Next.js 16 (static export), React 19, TypeScript, Tailwind 4. Sin backend,
sin APIs externas, sin IA en runtime. Todo el estado del usuario vive en el
dispositivo (IndexedDB, con fallback a localStorage y a memoria en SSR).

Idioma: **copy de interfaz en español**, **contenido de aprendizaje en inglés
británico**, metadatos y traducciones en español.

---

## 1. Modelo de datos del aprendizaje

### 1.1 Estructura de una entrada del mazo (`DeckEntry`, `lib/types.ts`)

```ts
export type PhraseStage = "seen" | "recognised" | "produced" | "mastered";
export type Box = 1 | 2 | 3 | 4 | 5;

export type DeckEntry = {
  phraseId: string;
  source: "catalog" | "custom";
  stage: PhraseStage;
  box: Box;
  inDeck: boolean;      // en la cola Leitner (guardada por el usuario o por fallo)
  suppressed: boolean;  // "Ya la domino" — nunca en feeds ni cola; gana sobre inDeck
  timesSeen: number;
  correctCount: number;
  wrongCount: number;
  producedCorrectAtLongBoxes: number; // producciones correctas con box >= 4
  lastSeenAt: number | null;
  lastAttemptAt: number | null;
  nextReviewAt: number | null;
  peekCount: number;    // nº de veces que reveló la traducción
  lastPeekMs: number | null; // ms entre mostrar la carta y revelar la traducción
  addedToDeckAt: number | null;
  frozen?: boolean;     // congelada por auto-triaje (opcional)
  producedAt?: number | null; // primera vez que llegó a "produced" (opcional)
};
```

Entrada nueva (`freshEntry`, `lib/deckOps.ts`): `stage:"seen"`, `box:1`,
`inDeck:false`, `suppressed:false`, todos los contadores a 0, fechas a `null`,
`frozen:false`, `producedAt:null`.

### 1.2 Ciclo de vida de una frase — estados y transiciones exactas

Estados: `seen → recognised → produced → mastered`. Rango de estado
(`STAGE_RANK`): seen 0, recognised 1, produced 2, mastered 3. **El estado solo
sube, nunca baja** (`advanceStage` en `lib/session/leitner.ts`):

```ts
function advanceStage(current, to) {
  return STAGE_RANK[to] > STAGE_RANK[current] ? to : current;
}
```

**Eventos que cambian el estado:**

- **Ver una carta de contenido** (`markSeen`): `timesSeen += 1`, `lastSeenAt = now`.
  NO cambia `stage` (una entrada nueva ya nace en `"seen"`). La exposición por sí
  sola nunca avanza más allá de `seen`.

- **Guardar (tap en la frase / corazón)** (`saveToDeck`): si ya `inDeck`, no hace
  nada; si no, `inDeck = true`, `suppressed = false`, `addedToDeckAt = now`,
  `nextReviewAt = nextReviewAt ?? now + intervalo(box)`. NO cambia `stage`.

- **Responder un checkpoint del feed** (`recordCheckpointResult`):
  - Si `inDeck && !suppressed` → aplica `applyReviewResult({correct, produced:false})`
    (actualización Leitner completa; ver 1.3).
  - Si NO está en el mazo y **acierta**: `correctCount += 1`, `lastAttemptAt = now`,
    y `stage: entry.stage === "seen" ? "recognised" : entry.stage`. **No** programa
    repaso ni entra al mazo.
  - Si NO está en el mazo, **suprimida** y falla: solo `wrongCount += 1`,
    `lastAttemptAt = now` (la supresión gana; no reentra).
  - Si NO está en el mazo, no suprimida y **falla**: `wrongCount += 1`,
    `inDeck = true`, `box = 1`, `addedToDeckAt = now`, `nextReviewAt = now + 1 día`.

- **Responder un repaso del Daily Snack** (`recordReviewResult`): aplica
  `applyReviewResult` con `produced = countsAsProduction(exercise)` (true para
  cloze y freetype; false para MCQ).

- **`applyReviewResult`** (transiciones de estado por recuperación):
  - Correcto + `produced:false` (MCQ) → `advanceStage(→ "recognised")`.
  - Correcto + `produced:true` (cloze/typed/spoken) → `advanceStage(→ "produced")`;
    si `stage` alcanza `"produced"` por primera vez y `producedAt` era null →
    `producedAt = now`. Si `box >= 4`, `producedCorrectAtLongBoxes += 1`; si ese
    contador llega a `>= 2` → `advanceStage(→ "mastered")`.
  - Incorrecto → **no cambia el estado** (solo baja la caja).

- **Puerta de dominio (autoevaluación)** (`recordMasteryResult`): ver 1.7. "Me
  salió" fija `stage = "mastered"` directamente (segunda vía a MASTERED).

- **"Ya la domino"** (`suppressPhrase`): `suppressed = true`. Deshacer
  (`unsuppressPhrase`): `suppressed = false`. No toca `stage`.

**DISCREPANCIA/nota:** hay **dos** caminos a `mastered`: (a) automático, dos
producciones correctas con `box >= 4`; (b) manual, botón "Me salió" en la puerta
de dominio de box 5. No hay ningún camino que degrade el estado.

### 1.3 SRS — sistema Leitner (`lib/session/leitner.ts`)

- **5 cajas.** Intervalos exactos, en días: `BOX_INTERVALS_DAYS = [1, 3, 7, 16, 35]`
  (caja 1→1d, 2→3d, 3→7d, 4→16d, 5→35d).
- **Acierto:** `box = min(box + 1, 5)`; se reprograma `nextReviewAt = now + intervalo(box_nuevo)`.
- **Fallo:** `box = max(box - 1, 1)` (baja **una** caja, suelo caja 1);
  `nextReviewAt = now + intervalo(box_nuevo)`. Nunca baja a cero ni resetea a caja 1
  de golpe.
- **Due (vencidas):** `inDeck && !suppressed && !frozen && nextReviewAt <= now`,
  ordenadas por `nextReviewAt` ascendente (más atrasada primero).
- **Tipo de ejercicio por caja** (`exercisePicker.exerciseTypeFor`): cajas **1–2 → MCQ**
  (reconocimiento ES→EN), caja **3 → cloze**, cajas **4–5 → freetype**.
  **DISCREPANCIA con specs previas:** una frase de catálogo en **box 5 que aún no
  es `mastered`** NO recibe freetype normal: `reviewCardFor` la deriva a la
  **puerta de dominio** (`{kind:"mastery"}`). Freetype de box 5 solo aparece para
  frases ya `mastered` o capturas.
- **Frases capturadas** (`source:"custom"`): siempre freetype de recuerdo libre
  contra la traducción propia del usuario.
- **Boost de misión semanal** (`jumpBox`): `box = min(box+1, 5)`, reprograma; **no**
  cuenta para el contador de dominio.

### 1.4 Auto-triaje del backlog (`lib/session/triage.ts`)

Constantes exactas:

```ts
export const DISPLAY_CAP = 8;               // tope de "due" mostrado
export const FREEZE_CAP = 25;               // por encima, se congela el excedente
export const THAW_WHEN_ACTIVE_AT_MOST = 10; // solo se descongela si la cola activa <= 10
export const THAW_PER_DAY = 3;              // descongeladas por día natural
export const COMEBACK_AFTER_DAYS = 4;
export const COMEBACK_SIZE = 5;
```

`reconcileTriage(deck, triage, now)` (se ejecuta al montar la home —
`useReconcileTriage`, una vez por montaje — y al terminar una sesión):

1. **Congelar:** si el nº de due activas (`inDeck && !suppressed && !frozen &&
   nextReviewAt <= now`) `> 25`, congela `(due.length - 25)` entradas, elegidas
   ordenando por **`box` ascendente, luego `nextReviewAt` ascendente** (las menos
   invertidas y más antiguas primero) → `frozen = true`.
2. **Descongelar:** si hay congeladas **y** la cola activa `<= 10`, descongela
   hasta `THAW_PER_DAY` (3) ese día, ordenando por **`box` descendente, luego
   `nextReviewAt` ascendente** (las más valiosas primero). Registra el gasto del
   día en `TriageStore.{lastThawDate, thawedToday}`.

Las frozen quedan fuera de todo recuento y de toda cola (Daily Snack, comeback,
CTA). "Nunca generan deuda visible."

### 1.5 `displayedDueCount` y el CTA de repaso

`displayedDueCount(n) = min(n, 8)`. El CTA de la home (`DueCta`) muestra el nº
tapado, nunca el crudo. Minutos estimados: `max(1, round(shown / 4))`.

### 1.6 Modo comeback (`DueCta` + `composeComebackSession`)

- **Disparo:** `daysSinceLastActivity(activity, now) >= 4`. `daysSinceLastActivity`
  toma el día ISO más reciente con actividad y calcula días naturales completos;
  `null` si nunca hubo actividad (usuario nuevo NO ve comeback).
- **Condición completa en `DueCta`:** solo entra en comeback si además hay due > 0.
- **Composición:** `composeComebackSession` = **solo repasos**, las **5 entradas
  due más valiosas** (`valuableDue`: `box` descendente, desempate `nextReviewAt`
  ascendente), sin contenido nuevo, sin checkpoints, terminando en carta final.
  Ruta `/comeback`. Al comeback NO se le añade la tarjeta de Level Check.

### 1.7 Puerta de dominio / autoevaluación (`recordMasteryResult`)

Aparece para box 5 no-`mastered` (catálogo). Botones y efectos exactos:

- **"Me salió"** (`me_salio`): `stage = "mastered"`, `box = 5`, `correctCount += 1`,
  `producedAt = producedAt ?? now`, `nextReviewAt = now + 35 días`.
- **"Regular"** (`regular`): sin cambios de caja/estado; `nextReviewAt = now + 3 días`.
- **"No me salió"** (`no_me_salio`): `wrongCount += 1`, `box = max(box-1, 1)`,
  reprograma al intervalo de la nueva caja. **El estado NO baja.**

La frase escrita por el usuario se guarda en su corpus (`appendSentence`), visible
en Ajustes y en la propia carta.

### 1.8 Level Check (`lib/level.ts`, `lib/checkSession.ts`)

- **Escala interna** (`LevelState`): `band ∈ {B2, C1, C2}`, `sub ∈ 0..10` (entero),
  se muestra como `"B2.4"` (`formatLevel = ${band}.${sub}`). Arranca en **B2.0**.
- **Umbrales de puntuación → movimiento** (`gainForScore`):
  - `score >= 85` → `+4` sub.
  - `60 <= score <= 84` → `+1` sub.
  - `score < 60` → `+0` (se mantiene plano).
  - **DISCREPANCIA con la spec:** la spec habla de "+0.4 / +0.1 sublevel"; la
    implementación usa `sub` entero con `+4` / `+1` (la "décima" es la unidad; se
    muestra `B2.4`, no `B2.0.4`). Los ejemplos de la spec (`B2.4`, `B2.6`) coinciden.
- **Movimiento** (`applyCheckResult`): con `gain > 0`, si `sub >= 10` y hay banda
  siguiente → salta a la banda siguiente con `sub = 0`; si no, `sub = min(sub+gain, 10)`.
  Es decir, **dentro de una banda topa en .10 y solo cruza a la siguiente `.0`
  partiendo de .10** (ej.: `B2.8` +fuerte → `B2.10`, NO `C1.x`; `B2.10` +cualquiera
  → `C1.0`). Techo absoluto **C2.10**. **Nunca decrece.** Se registra en `history`
  `{at, band, sub, score}` y se reinicia el contador de hito con un nuevo umbral.
- **Cadencia del disparo:** contador `cardsSinceCheck` sube en `+1` por cada carta
  de contenido **nueva** vista en una sesión (`bumpCardsSeen`, en `SessionPlayer`,
  deduplicado por sesión). Disponible cuando `cardsSinceCheck >= checkThreshold`.
  `checkThreshold` se re-aleatoriza a **[50, 60]** (inclusive) tras cada chequeo
  (`rollThreshold = 50 + floor(rng()*11)`). Nunca por tiempo.
  - **Nota de comportamiento:** mientras esté disponible, la tarjeta opt-in se
    antepone al inicio de **cada** sesión de feed normal (categoría o snack) hasta
    que se hace el chequeo (que resetea el contador). No es una única aparición.
- **Composición del chequeo** (`composeCheck`, `TOTAL = 10`):
  - `RETENTION = 4` ítems: MCQ de reconocimiento, prioridad de pools
    `mastered → produced → recognised → seen`.
  - `PRODUCTION = 4` ítems: cloze, prioridad `produced → recognised → seen → mastered`
    (si la frase no es "clozeable", cae a MCQ).
  - `stretch = TOTAL - (ítems ya añadidos)` ítems: MCQ de reconocimiento de frases
    de la **banda siguiente** (`nextBand(level.band)`, o la misma si C2) que el
    usuario **no ha estudiado** (`!inDeck && timesSeen === 0`).
  - **Relleno:** si tras todo hay `< 10`, completa con más MCQ de
    `seen → recognised → produced → mastered`. Sin duplicar frases.
  - **DISCREPANCIA con la spec ("~40/40/20"):** son objetivos, no garantías; con
    pools finos los fallbacks cambian la mezcla (p. ej. más retención). Con pocas
    frases, el chequeo puede tener `< 10` ítems (mínimo lo que haya). El chequeo
    **no muta el mazo** (es evaluación pura).
- **Puntuación:** `scoreCheck(correct, total) = round(correct/total*100)`.
- **Qué pasa si sale mal:** `score < 60` → `+0`, el nivel se mantiene; pantalla de
  resultado en positivo (ver §2). No hay penalización ni lenguaje de fallo.
- **NO bloquea contenido:** ninguna ruta/filtro consulta el nivel. Todas las
  categorías y niveles B2/C1/C2 son navegables siempre.

### 1.9 Misión semanal (`lib/mission.ts`)

- `MISSION_SIZE = 3`. `buildMission(deck, weekKey)`: toma frases con
  `stage === "produced" && !suppressed`, orden base alfabético por id, baraja con
  PRNG sembrado por `weekKey` (`seededRngFrom`), toma 3. `null` si no hay ninguna
  en `produced`.
- Clave de semana: `mondayOfWeek()` (lunes ISO local). Marcar una frase
  (`checkOffMission`) da un `jumpBox` (+1 caja) a esa frase.

### 1.10 Recap semanal (`lib/recap.ts`)

- `buildRecap` mira la **semana anterior** (los 7 días previos al lunes de esta
  semana): `activeDays` (días con actividad), `produced` (entradas con `producedAt`
  dentro de esa ventana), `topCategory` (categoría con más entradas cuyo
  `lastAttemptAt` cae en la ventana, vía `phraseCategoryIndex`).
- `shouldShowRecap`: solo si **hoy es lunes** (`mondayOfWeek(now) === hoy`), la
  semana no está reconocida (`triage.recapAckedWeek`), y `activeDays > 0 || produced > 0`.
- Marco siempre positivo; sin comparación semana-a-semana.

### 1.11 Otros sistemas de estado/progreso

- **Actividad** (`ActivityStore`): `Record<isoDate, true>`. Se marca el día al
  **terminar** una sesión (`SessionPlayer` close-out). Pipeline de la home muestra
  7 puntos (relleno = día activo).
- **Temas completados** (`Record<topicId, true>`): se marca cada topic que aportó
  escenas al llegar a la carta final; el grid deja de resurfacearlos primero.
- **Corpus de frases propias** (`SentenceStore`): `Record<phraseId, {text, createdAt}[]>`.
- **Pipeline de progreso** (`ProgressPipeline`): cuenta entradas no-suprimidas por
  estado: `vistas` (seen), `en camino` (recognised|produced), `dominadas` (mastered).
  Oculta un contador si es 0.
- **Claves de almacenamiento** (`lib/storage/keys.ts`):
  `sticky-english.{deck,topics,captures,activity,mission,meta,triage,sentences,level}`
  (deck/topics/captures/activity/mission/meta = `.v2`; triage/sentences/level = `.v3`).
- **Migración v1→v2** (`lib/storage/migrate.ts`): al primer arranque, convierte el
  formato v1 (solo localStorage). Los aciertos de v1 mapean como mucho a
  `stage:"recognised"` y `box <= 3` (v1 nunca probó producción). Se conservan las
  claves v1 por rollback. Campos v3 (`frozen`, `producedAt`) y docs nuevos
  (triage, sentences, level) se añaden sin migración destructiva.

---

## 2. Copy literal de la interfaz

> Todo el texto visible, agrupado por pantalla/componente. Verbatim.

### Home (`components/TopicGrid.tsx`, `SnackHero`, `LevelBadge`, `ProgressPipeline`, `DueCta`, `ComebackCta`)

- Eyebrow: **`Sticky English`**
- Botón "+": aria-label **`Capturar una frase que has oído`**, glifo **`+`**
- Link ajustes: aria-label **`Ajustes`**, glifo **`⚙`**
- Saludo: **`Un ratito de inglés, cuando quieras.`**
- Sección grid: título **`Explora`**; botón refrescar aria-label **`Ver otros temas`**, glifo **`↻`**
- Chips de nivel: **`B2`**, **`C1`**, **`C2`** (seleccionado añade **`✓`** antes)
- Estado vacío del grid: **`Ningún tema con esos filtros — prueba a quitar alguno.`**

Daily Snack hero (`SnackHero`):
- Título: **`Daily Snack`**
- Subtítulo por defecto (antes de hidratar): **`Repaso + algo nuevo · 3-5 min`**
- Subtítulo calculado: `${repasos} repaso(s) + ${nuevas} nuevas · 3 min`, o si
  `repasos === 0`: `${nuevas} nuevas · 3 min`. (`repasos = displayedDueCount(due)`,
  `nuevas = max(0, 13 - repasos)`.)

Badge de nivel (`LevelBadge`):
- Badge: el nivel, p. ej. **`B2.0`**
- Etiqueta: **`tu nivel en la app`**
- Tooltip (solo la primera vez): **`Esto mide tu progreso en la app, no es una certificación oficial de inglés.`** — botón **`Entendido`**

Pipeline (`ProgressPipeline`): etiquetas **`vistas`**, **`en camino`**, **`dominadas`**;
línea **`Esta semana`** + 7 puntos; aria-label del grupo de puntos:
`${n} días activos esta semana`.

CTA de repaso (`DueCta`): **`1 frase lista para repasar`** / **`${n} frases listas para repasar`** + **`${min} min`**.

CTA comeback (`ComebackCta`): **`Bienvenido de vuelta — 5 frases en 90 segundos`** + **`→`**

### Tarjeta de feed — módulo de frase (`components/PhraseBadge.tsx`)

- Eyebrow: **`Sticky phrase`**
- Frase: `phrase.text` (amarillo, grande). Corazón: **`♥`** (guardada) / **`♡`**.
  aria-label: **`Guardada en tu mazo`** / **`Guardar en tu mazo`**.
- Altavoz: **`🔊`**, aria-label **`Escuchar el ejemplo`**.
- Revelar traducción (overlay sobre la traducción difuminada): **`Toca para comprobar`**.
- Undo tras "Ya la domino": **`No volverás a verla`** + botón **`Deshacer`**.
- Action sheet (long-press): muestra `phrase.text` y `phrase.meaningEs`, botón
  **`Ya la domino`** y botón **`Cancelar`**. aria-label del diálogo: **`Acciones de la frase`**.

### Tarjeta de feed — variante audio-first (`components/SceneRenderer.tsx`)

- **`Escucha la frase`**
- **`Toca para ver el texto`**
- **`Repetir audio`**
- Chip de contexto de cada escena: `${scene.topic} · ${scene.angle}`.

### Checkpoint / repaso MCQ (`components/exercises/McqCard.tsx`)

- Kicker: **`¿Te suena?`** (checkpoint del feed) / **`Repaso rápido`** (repaso snack) / **`¿Cuál es?`** (Level Check).
- Sin responder: **`Toca una para seguir — sin presión.`**
- Feedback acierto: **`Eso es.`**
- Feedback fallo: **`Todo bien — volverá pronto.`**
- Bajo el feedback: `${phrase.text} · ${phrase.meaningEs}`.

### Respuesta escrita — cloze/freetype (`components/exercises/TypedAnswerCard.tsx`)

- Kicker: **`Complétala`** (cloze) / **`¿Cómo se decía?`** (freetype).
- Placeholder cloze: `Empieza por “${hint}”…`. Placeholder freetype: **`Escríbela en inglés…`**.
- Botón: **`Comprobar`**.
- Feedback correcto: **`Eso es.`**
- Feedback "near" (un typo): `Casi — es «${forma canónica}».`
- Feedback incorrecto: `Era «${forma canónica}». Volverá pronto.`

### Producción hablada (`components/exercises/SpokenAnswerCard.tsx`)

- Kicker: **`Dilo en voz alta`**. Prompt: `“${promptEs}”`.
- Mic: **`🎤`**, aria-label **`Hablar`**.
- Escuchando: **`Escuchando…`**. Idle: **`Toca y dilo — sin prisa`**.
- Fallback: **`Prefiero escribirla`**.
- Acierto: **`Eso es.`** Fallo: `Casi — era «${canónica}». Volverá pronto.`
- Transcripción: `Te oí: “${transcript}”`.

### Puerta de dominio (`components/exercises/MasteryCard.tsx`)

- Kicker: **`Úsala en una frase tuya`**. Muestra `phrase.text`.
- Placeholder: **`Escribe una frase con esta expresión…`**. Mic aria-label **`Dictar`**.
- Botón: **`Ver modelo`**.
- Etiquetas: **`Tu frase`**, **`Modelo`**, pregunta **`¿Cómo te salió?`**.
- Botones: **`Me salió`**, **`Regular`**, **`No me salió`**.
- Historial: **`Tus frases anteriores`**, cada una `“${text}”`.

### Fin de sesión (`components/SessionEnd.tsx`)

- Título: **`Sesión hecha ✓`** (encima, `title` de la sesión).
- Tres columnas: `${n}` + **`frase vista`/`frases vistas`**, **`guardada`/`guardadas`**, **`recuperada`/`recuperadas`**.
- Botones: **`Otra ronda`**, **`Volver al inicio`**.

### Navegación de sesión (`components/SessionPlayer.tsx`)

- Volver: aria-label **`Volver a los temas`**, glifo **`←`**.
- Hint inferior: **`Desliza hacia arriba ↑`** (si puede avanzar) / **`Responde para seguir`**.
- Flechas (solo puntero fino): aria-labels **`Anterior`** / **`Siguiente`** (**`↑`**/**`↓`**).

### Oferta de Level Check en el feed (`SessionPlayer`, `kind:"check_offer"`)

- **`✨`**
- **`Chequeo de nivel disponible`**
- **`Un repaso rápido para ver cómo vas. 2 min, cuando quieras.`**
- Botón: **`Hacer el chequeo`**. Botón secundario: **`Ahora no`**.

### Level Check — reproductor (`components/CheckPlayer.tsx`)

- Eyebrow: **`Chequeo de nivel`**. Botón inferior: **`Siguiente`** / **`Ver resultado`** (último).

### Level Check — resultado (`components/CheckResult.tsx`) — TODAS las variantes

- Eyebrow: **`Chequeo de nivel`**.
- **Si sube:** `¡Subes a ${nivel}! 🎉`. Nota afirmativa:
  - `score >= 85` → **`Retención y producción sólidas — se nota el salto.`**
  - `score < 85` (pero subió por 60–84) → **`Vas afianzando lo aprendido. Buen ritmo.`**
- **Si se mantiene:** `Sigues en ${nivel}` + **`Un poco más y subes. Vas por buen camino.`**
- Marcador: `${score}%` + **`en este chequeo`**.
- Botón: **`Seguir`**.
- Estado sin material (CheckLoader): **`Aún no hay bastante material para un chequeo.`** + **`Volver`**.
- Cargando: **`Preparando el chequeo…`**.

### Misión semanal (`components/MissionCard.tsx`)

- Eyebrow: **`Misión de la semana`**.
- **`Úsalas en una conversación real esta semana:`**
- Cada frase: `phrase.text` + estado **`✓ usada`** (hecha) / **`marcar`**.

### Recap semanal (`components/RecapCard.tsx`)

- Eyebrow: **`Tu semana`**. Cerrar: aria-label **`Cerrar resumen`**, glifo **`✕`**.
- Líneas (condicionales):
  - **`1 día activo la semana pasada`** / **`${n} días activos la semana pasada`**
  - (si produced>0) **`1 frase nueva que ya produces`** / **`${n} frases nuevas que ya produces`**
  - (si topCategory) `Lo que más practicaste: ${categoría}`

### Ajustes (`app/settings/page.tsx`)

- Volver: aria-label **`Volver al inicio`** (**`←`**). Título: **`Ajustes`**.
- Estado: `${n} frases con progreso · ${m} capturadas` / cargando **`Cargando…`**.
- Nota: **`Tu progreso vive solo en este dispositivo. Exporta una copia si cambias de móvil o limpias el navegador.`**
- Botones: **`Exportar mi progreso (JSON)`**, **`Importar una copia`**.
- Sección: **`Tus frases`** (cada frase con sus intentos `“${text}”`).
- **`Borrar todo`**.
- Confirmación de borrado (`window.confirm`): **`¿Borrar todo tu progreso? Esto no se puede deshacer.`**
- Errores de importación (`importAll`): **`El archivo no es JSON válido.`** /
  **`El archivo no es una copia de Sticky English.`**

### Captura rápida (`components/CaptureSheet.tsx`)

- Diálogo aria-label: **`Capturar una frase`**. Título: **`La has oído por ahí`**.
- Placeholders: **`La frase en inglés…`**, **`Traducción (opcional)`**, **`Nota — ¿dónde la oíste? (opcional)`**.
- Botones: **`Cancelar`**, **`Al mazo`**.

### Onboarding / tooltips

- **No existe onboarding ni tutorial.** El único elemento de primera vez es el
  tooltip del `LevelBadge` (texto arriba). La `<title>` del documento es
  **`Sticky English`**, descripción **`English that sticks while you scroll.`**
  (`app/layout.tsx`).

---

## 3. Inventario de pantallas y flujos

### Rutas existentes (`app/`)

| Ruta | Componente | Qué la dispara |
|---|---|---|
| `/` | `TopicGrid` (Home) | Apertura de la app |
| `/snack` | `SessionLoader mode=snack` | Botón "Daily Snack" / CTA de repaso |
| `/feed/[topicId]` | `SessionLoader mode=category` (seed = topic) | Tap en una portada del grid (una página estática por topic) |
| `/comeback` | `SessionLoader mode=comeback` | CTA "Bienvenido de vuelta" (≥4 días inactivo) |
| `/check` | `CheckLoader` | Botón "Hacer el chequeo" de la tarjeta opt-in |
| `/settings` | `SettingsPage` | Icono ⚙ en la home |

Todas se sirven como export estático (GitHub Pages). No hay rutas de servidor.

### Primera apertura (onboarding real)

1. Se monta `AppStateProvider`; ejecuta `ensureMigrated` (migración v1→v2, no-op para
   usuario nuevo) y crea los docs por defecto.
2. Home: eyebrow "Sticky English", botones + y ⚙, saludo "Un ratito de inglés,
   cuando quieras."
3. `DueCta` → oculto (0 due). `SnackHero` → subtítulo "Repaso + algo nuevo · 3-5 min".
4. `LevelBadge` → **`B2.0`** + **tooltip** "Esto mide tu progreso en la app, no es
   una certificación oficial de inglés." (una sola vez; "Entendido" lo cierra).
5. `ProgressPipeline`, `RecapCard`, `MissionCard` → todos ocultos (sin datos / no lunes / sin produced).
6. Sección "Explora": chips B2/C1/C2, chips de categoría (scroll horizontal), grid
   de 4 portadas por defecto (`DEFAULT_TOPIC_IDS`), botón ↻.
7. No hay más pasos guiados. El usuario toca una portada o el Daily Snack.

### Daily Snack completo (`/snack`)

1. `SessionLoader` espera hidratación de deck/topics/captures/level.
2. `composeSnackSession`: objetivo **13 cartas**. Toma hasta `round(13*0.6)=8`
   repasos due (más atrasados primero); rellena con contenido nuevo de topics no
   completados; presupuesto de checkpoints `= floor(contentBudget/6)`.
   - Escasez: pocos due → más contenido nuevo; poco contenido nuevo → más repasos;
     por debajo de un **suelo de 6**, tira de "casi vencidas" (`upcomingEntries`);
     mazo vacío + nada nuevo → solo carta final.
   - Intercalado: ~2 repasos, luego ~3 de contenido, se repite; `markAudioFirst`
     marca 1 de cada 5 cartas de contenido como audio-first; checkpoints inyectados
     por `interleaveCheckpoints`.
3. Si el Level Check está disponible, `SessionLoader` **antepone** la tarjeta
   `check_offer` como primera carta.
4. `SessionPlayer`: navegación por swipe vertical / teclado (flechas solo con ratón).
   Barra de progreso arriba (`FeedProgress`, `${index+1}/${total}`, total excluye la
   carta final). Cada carta de contenido nueva → `markSeen` + `bumpCardsSeen`.
5. Los checkpoints/repasos **bloquean** el avance hasta responder (`isGated`).
6. Al llegar a `{kind:"end"}`: carta "Sesión hecha ✓" con vistas/guardadas/recuperadas;
   se marca el día de actividad, se marcan topics aportados y se ejecuta
   `reconcileTriage`. Botones "Otra ronda" (recompón) / "Volver al inicio".

### Checkpoint de retrieval (dentro del feed)

1. Cada 4–5 cartas de contenido, `interleaveCheckpoints` inserta un MCQ que prueba
   una frase vista **antes en esta misma sesión** (reusa un checkpoint autorado si
   existe para esa frase; si no, genera MCQ). Kicker "¿Te suena?".
2. El usuario toca una opción → feedback ("Eso es." / "Todo bien — volverá pronto.")
   + `phrase.text · meaningEs`. Se aplica `recordCheckpointResult` (ver §1.2).
3. Desbloquea el avance.

### Level Check completo (`/check`)

1. `CheckLoader` compone 10 ítems (`composeCheck`) una vez hidratado deck+level.
2. `CheckPlayer`: cabecera "Chequeo de nivel" + puntos de progreso. Cada ítem es
   MCQ ("¿Cuál es?") o cloze; tras responder aparece "Siguiente" (o "Ver resultado").
   **No escribe en el mazo.**
3. Al terminar: `score = round(aciertos/total*100)`; `applyCheckResult` mueve el
   nivel (ver §1.8) y persiste `history`.
4. `CheckResult`: variante de subida ("¡Subes a X! 🎉" + nota) o plana ("Sigues en
   X" + "Un poco más y subes…"), `${score}%`, botón "Seguir" → `/`.

### Captura rápida (+)

1. Tap en "+" → hoja inferior "La has oído por ahí".
2. Campos: frase en inglés (obligatorio), traducción (opcional), nota (opcional).
3. "Al mazo": crea `CapturedPhrase` y una `DeckEntry` `source:"custom"` con
   `inDeck:true`, `timesSeen:1`, `nextReviewAt = now + 1 día`. Cierra la hoja.
4. Las capturas se repasan como freetype contra la traducción propia.

### "Ya la domino" con undo

1. **Long-press (500 ms)** sobre el módulo de frase → hoja de acciones.
2. "Ya la domino" → `suppressPhrase` (suprimida), cierra la hoja, muestra inline
   **"No volverás a verla · Deshacer"**.
3. "Deshacer" → `unsuppressPhrase` (revierte) y oculta el aviso.

---

## 4. Interacciones y gestos (tarjeta de feed)

- **Swipe vertical** (umbral 48 px, `SWIPE_THRESHOLD`): arriba = siguiente, abajo =
  anterior. Swipe horizontal también funciona (izq = siguiente, der = anterior).
- **Teclado:** `ArrowDown`/`ArrowRight`/`Espacio` = siguiente; `ArrowUp`/`ArrowLeft`
  = anterior (ignorado si el foco está en input/textarea).
- **Flechas ↑/↓:** solo visibles en `@media (pointer: fine)` (ratón/trackpad); en
  táctil se ocultan (`.fine-pointer-only`).
- **Tap en la frase / corazón:** guardar al mazo (`saveToDeck`).
- **Tap en "Toca para comprobar":** revela la traducción (quita el blur) y registra
  el peek (`recordPeek`, guarda `lastPeekMs` = ms desde el montaje de la carta).
- **Long-press en el módulo de frase (500 ms, `LONG_PRESS_MS`):** abre la hoja de
  acciones ("Ya la domino"). Si dispara el long-press, se suprime el tap de guardar.
- **Tap en 🔊:** TTS del `phrase.example` en `en-GB` (Web Speech API, `rate 0.95`).
- **Carta audio-first:** tap 1 (botón "Escucha la frase") revela texto + módulo de
  frase; tap 2 (dentro del módulo, "Toca para comprobar") revela traducción. El
  audio se reproduce solo al montar si hay TTS.
- **No hay doble-tap** con función asignada.

**Timings (exactos):**

- Entrada de carta `scene-enter`: **380 ms** `cubic-bezier(0.22,1,0.36,1)`.
- `badge-pop` (aparición del módulo/feedback): **420 ms** con **180 ms** de delay.
- Blur-reveal de la traducción: transición **200 ms** (`duration-200`); blur en
  reposo `blur-[6px]`.
- Hint inferior `hint-float`: **2.2 s** en bucle.
- Timer de producción hablada `soft-timer`: **10 s** (`SOFT_TIMER_MS = 10_000`),
  barra que se vacía; **visual, sin penalización** al expirar (vuelve a idle).
- Long-press: **500 ms**.
- Reconocimiento de voz: `en-GB`, `interimResults:false`, `maxAlternatives:1`,
  `continuous:false`; matching por tokens con similitud **≥ 0.8** (`matchesSpokenTarget`).

---

## 5. Muestra de contenido real (verbatim del código)

### Cars & Mobility

Frases (`lib/data/categories/cars-and-mobility.ts`):

```ts
{ id: "not-worth-it", text: "not worth it", meaningEs: "no vale la pena",
  example: "If the battery costs half the price, it's not worth it.",
  level: "B2", tags: ["opinion","money"],
  examples: ["Paying extra for the panoramic roof on a lease is really not worth it.",
             "The extended warranty sounds reassuring, but the small print makes it not worth it."] }

{ id: "not-so-cheap", text: "not so cheap", meaningEs: "no tan barato",
  example: "Real price: not so cheap.", level: "B2", tags: ["money"],
  examples: ["Free charging at the dealer turns out to be not so cheap once you read the tariff.",
             "That bargain city car is not so cheap after insurance and the congestion charge."] }
```

Escenas que las presentan:

```ts
{ id: "scooter-hero-battery", sceneType: "hero_image", topic: "Electric scooters",
  angle: "Hidden cost", phraseId: "not-worth-it", backgroundImage: "scooter",
  hook: "The scooter is cheap.\nThe battery replacement is not.", body: "",
  payoff: "If the battery costs half the price,\nit's not worth it." }

{ id: "scooter-price-real", sceneType: "price_breakdown", topic: "Electric scooters",
  angle: "Real price", phraseId: "not-so-cheap", title: "The €250 scooter, one year later",
  rows: [ {label:"Cheap scooter", value:"€250"}, {label:"Battery replacement", value:"€180"},
          {label:"Brake repair", value:"€90"} ], punchline: "Real price: not so cheap." }
```

### Tech & AI

```ts
{ id: "it-depends-on", text: "it depends on", meaningEs: "depende de",
  example: "It depends on how long the battery lasts.", level: "B2",
  tags: ["opinion"], variants: ["depends on"],
  examples: ["Whether the model helps really depends on the quality of your prompt.",
             "It depends on how much you trust an answer you cannot check."] }

{ id: "actually-works", text: "actually works", meaningEs: "funciona de verdad",
  example: "They need one workflow that actually works.", level: "C1",
  tags: ["opinion","tech"], variants: ["actually work"],
  examples: ["Half the AI features demoed never actually work in daily use.",
             "Strip the hype and see what actually works for your workflow."] }
```

### Science & Weird Facts

```ts
{ id: "between-both", text: "between both", meaningEs: "entre ambas cosas",
  example: "Good content lives between both.", level: "C2", tags: ["abstract"],
  examples: ["The truth usually sits somewhere between both extremes.",
             "There is a subtle difference between both readings."] }

{ id: "make-a-mountain-out-of-a-molehill", text: "make a mountain out of a molehill",
  meaningEs: "hacer una montaña de un grano de arena",
  example: "Worrying about it would make a mountain out of a molehill.", level: "B2",
  tags: ["opinion"],
  variants: ["makes a mountain out of a molehill","made a mountain out of a molehill","making a mountain out of a molehill"],
  examples: ["Tabloids love to make a mountain out of a molehill from one weak study.",
             "Do not make a mountain out of a molehill over a rounding error."] }
```

### Personal Finance & Crypto

```ts
{ id: "too-good-to-be-true", text: "too good to be true", meaningEs: "demasiado bueno para ser verdad",
  example: "40% returns a month? That's too good to be true.", level: "C1", tags: ["opinion","risk"],
  examples: ["A guaranteed twenty percent return is too good to be true.",
             "The airdrop looked too good to be true, and it was."] }

{ id: "worth-the-hype", text: "worth the hype", meaningEs: "vale la pena el revuelo",
  example: "Is it worth the hype, or just a good trailer?", level: "C2", tags: ["opinion"],
  variants: ["worth the hype it gets"],
  examples: ["Most meme coins are simply not worth the hype.",
             "Those ETFs may not be worth the hype it gets."] }
```

### Meetings & Leadership (categoría C1, la más nueva)

```ts
{ id: "push-back-on", text: "push back on", meaningEs: "rebatir, objetar (con tacto)",
  example: "I'd push back on that timeline; two weeks is not realistic.", level: "C1",
  tags: ["opinion","work"], variants: ["push back on that","pushed back on","pushing back on"],
  examples: ["Feel free to push back on any assumption in the plan.",
             "She pushed back on the budget before it was signed off."] }

{ id: "see-it-differently", text: "see it slightly differently", meaningEs: "lo veo un poco distinto",
  example: "I see it slightly differently: the risk is the vendor, not the deadline.", level: "C1",
  tags: ["opinion","work"],
  examples: ["On pricing, I see it slightly differently from the rest of the room.",
             "I might see it slightly differently, but hear me out first."] }
```

Escena de ejemplo:

```ts
{ id: "ml-push-back-poster", sceneType: "editorial_poster", topic: "Disagree without drama",
  angle: "The polite no", phraseId: "push-back-on", hook: "Disagreeing without a fight",
  body: "\"I'd push back on that timeline; two weeks is not realistic,\" she said — and the room relaxed.",
  accent: "violet" }
```

**Escala real del catálogo:** 21 módulos de categoría en `lib/data/categories/`
(20 originales + "Meetings & Leadership"). El export estático genera 334 páginas
(1 por topic + rutas fijas). Los niveles CEFR son B2/C1/C2 (no hay A-levels).

---

## 6. Historial de decisiones de diseño

Documentado en README ("What NOT to build" del spec original y notas de v3):

- **No construido a propósito:** rachas diarias, XP, ligas, funciones sociales,
  notificaciones push, cuentas/login, listas de vocabulario tipo diccionario.
- **Nada de IA/API en runtime** ni coste en ejecución: TTS y reconocimiento de voz
  son APIs nativas del navegador; el contenido se genera en desarrollo y se commitea.
- **El Level Check NO es certificación** (declarado en tooltip de una vez) y **no
  bloquea contenido**; el nivel nunca baja.
- **Copy sin marco de pérdida:** prohibido "perdiste"/"racha rota"/"suspendido"; el
  CTA dice "listas para repasar" (no "a punto de olvidarse", reescrito en la ronda
  de UI). Los resultados de chequeo y checkpoints siempre en positivo.
- **Producción hablada con degradación silenciosa:** si el navegador no soporta
  `SpeechRecognition` o se deniega el micro, cae a escritura sin avisar (Chrome/Edge
  la soportan; Safari parcial; Firefox no).

Pendiente / fuera de alcance (declarado en las entregas de esta sesión):

- **Sin pantalla "My Deck"** navegable: el estado de ciclo de vida se quitó de las
  tarjetas de feed; solo se ven las frases propias en Ajustes. Los "4 puntos de
  progreso" que pedía una revisión de diseño no tienen hogar todavía.
- **Historial de Level Check** (`LevelState.history`) se guarda pero **no hay
  vista** "nivel a lo largo del tiempo" (marcada opcional).
- **`enrichCapture()`** es un stub para enriquecimiento futuro (no hace nada hoy).
- `lib/data/scenes.ts` monolítico se dividió por categoría; el resto de la deuda
  de tamaño se marcó "vigilar, no actuar".

---

## 7. Estado real de uso / telemetría

**No existe ninguna telemetría, analítica ni tracking de uso.** Búsqueda en
`lib/`, `components/` y `app/` de `analytics|gtag|mixpanel|amplitude|posthog|
sendBeacon|track(|fetch(|navigator.*|dataLayer`: **cero coincidencias**. No hay
llamadas de red de ningún tipo (coherente con "sin backend, static export).

En consecuencia:

- **No hay datos de uso reales agregados** (sesiones completadas, tarjetas vistas,
  distribución de frases por caja Leitner, resultados de Level Checks) accesibles
  a nadie fuera del dispositivo del usuario.
- Sí existen **contadores locales por usuario** en IndexedDB, pero solo visibles en
  ese dispositivo y solo de forma parcial en UI: `DeckEntry` guarda
  `timesSeen/correctCount/wrongCount/box/stage/peekCount/lastPeekMs/producedAt`;
  `LevelState.history` guarda cada chequeo (`{at, band, sub, score}`);
  `ActivityStore` guarda los días activos. El único modo de inspeccionarlos es el
  export JSON de Ajustes (o abrir IndexedDB en devtools). **No se recopilan ni se
  envían a ningún sitio.**

**Hallazgo:** cualquier evaluación de comportamiento real (retención, abandono,
qué categorías enganchan, tasa de acierto por caja) es **imposible con los datos
actuales** — no se está midiendo nada centralizado. Toda la validación hasta hoy
es funcional (334 tests) y manual (verificación en navegador), no de uso real.
```
