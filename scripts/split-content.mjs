// One-shot mechanical split of lib/data/{phrases,topics,scenes}.ts into
// per-category modules under lib/data/categories/, preserving each entry's
// original source text. Barrel files keep every existing export working.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "lib", "data");
const outDir = path.join(dataDir, "categories");

/** Extracts the elements of `export const <name> = [ ... ]` as source-text strings. */
function extractArrayElements(filePath, exportName) {
  const source = fs.readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  let elements = null;
  sf.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const decl of node.declarationList.declarations) {
      if (
        ts.isIdentifier(decl.name) &&
        decl.name.text === exportName &&
        decl.initializer &&
        ts.isArrayLiteralExpression(decl.initializer)
      ) {
        elements = decl.initializer.elements.map((el) => source.slice(el.getStart(sf), el.end));
      }
    }
  });
  if (!elements) throw new Error(`No array export "${exportName}" in ${filePath}`);
  return elements;
}

const evalEntry = (text) => new Function(`return (${text});`)();

const phraseTexts = extractArrayElements(path.join(dataDir, "phrases.ts"), "phrases");
const topicTexts = extractArrayElements(path.join(dataDir, "topics.ts"), "topics");
const sceneTexts = extractArrayElements(path.join(dataDir, "scenes.ts"), "contentScenes");
const checkpointTexts = extractArrayElements(path.join(dataDir, "scenes.ts"), "checkpointScenes");

const phrases = phraseTexts.map(evalEntry);
const topics = topicTexts.map(evalEntry);
const scenes = sceneTexts.map(evalEntry);
const checkpoints = checkpointTexts.map(evalEntry);

console.log(
  `parsed: ${phrases.length} phrases, ${topics.length} topics, ${scenes.length} scenes, ${checkpoints.length} checkpoints`
);

// Categories in first-appearance order (stable barrels, natural diffs).
const categories = [...new Set(topics.map((t) => t.category))];
const slugOf = (c) =>
  c.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const categoryByTopicId = new Map(topics.map((t) => [t.id, t.category]));

// phrase → category: first content-scene use, then checkpoint use, then preview chip.
const categoryByPhraseId = new Map();
for (const s of scenes) {
  if (!categoryByPhraseId.has(s.phraseId)) {
    categoryByPhraseId.set(s.phraseId, categoryByTopicId.get(s.topicId));
  }
}
for (const c of checkpoints) {
  if (!categoryByPhraseId.has(c.phraseId)) {
    categoryByPhraseId.set(c.phraseId, categoryByTopicId.get(c.topicId));
  }
}
for (const t of topics) {
  for (const pid of t.previewPhraseIds) {
    if (!categoryByPhraseId.has(pid)) categoryByPhraseId.set(pid, t.category);
  }
}

const orphanPhrases = phrases.filter((p) => !categoryByPhraseId.has(p.id));
if (orphanPhrases.length > 0) {
  throw new Error(`Phrases with no category mapping: ${orphanPhrases.map((p) => p.id).join(", ")}`);
}

const indent = (text) => `  ${text.replace(/\n/g, "\n  ")},`;

fs.mkdirSync(outDir, { recursive: true });
const moduleNames = [];
for (const category of categories) {
  const slug = slugOf(category);
  moduleNames.push(slug);
  const pick = (texts, values, belongs) =>
    texts.filter((_, i) => belongs(values[i])).map(indent).join("\n");

  const body = `import type { CheckpointScene, ContentScene, Phrase, TopicTile } from "@/lib/types";

// ${category}

export const phrases: Phrase[] = [
${pick(phraseTexts, phrases, (p) => categoryByPhraseId.get(p.id) === category)}
];

export const topics: TopicTile[] = [
${pick(topicTexts, topics, (t) => t.category === category)}
];

export const contentScenes: ContentScene[] = [
${pick(sceneTexts, scenes, (s) => categoryByTopicId.get(s.topicId) === category)}
];

export const checkpointScenes: CheckpointScene[] = [
${pick(checkpointTexts, checkpoints, (c) => categoryByTopicId.get(c.topicId) === category)}
];
`;
  fs.writeFileSync(path.join(outDir, `${slug}.ts`), body);
  console.log(`wrote categories/${slug}.ts`);
}

const importName = (slug) => slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

const importsFor = (what) =>
  moduleNames
    .map((slug) => `import { ${what} as ${importName(slug)} } from "@/lib/data/categories/${slug}";`)
    .join("\n");
const spread = () => moduleNames.map((slug) => `  ...${importName(slug)},`).join("\n");

fs.writeFileSync(
  path.join(dataDir, "phrases.ts"),
  `import type { Phrase } from "@/lib/types";
${importsFor("phrases")}

export const phrases: Phrase[] = [
${spread()}
];

export const phraseById = new Map(phrases.map((p) => [p.id, p]));

export function getPhrase(id: string): Phrase {
  const phrase = phraseById.get(id);
  if (!phrase) throw new Error(\`Unknown phraseId: \${id}\`);
  return phrase;
}
`
);

fs.writeFileSync(
  path.join(dataDir, "topics.ts"),
  `import type { TopicTile } from "@/lib/types";
${importsFor("topics")}

export const topics: TopicTile[] = [
${spread()}
];

export const topicById = new Map(topics.map((t) => [t.id, t]));

export const CATEGORIES = [...new Set(topics.map((t) => t.category))].sort();

export const LEVELS: TopicTile["difficulty"][] = ["B2", "C1", "C2"];

/** The original curated 10 — shown before the user ever taps "refresh". */
export const DEFAULT_TOPIC_IDS = [
  "electric-scooters",
  "smart-homes",
  "ai-tools",
  "ux-design",
  "weird-science",
  "travel-hacks",
  "hidden-costs",
  "gadgets",
  "cheap-travel",
  "bad-ux-premium",
];
`
);

const sceneImports = moduleNames
  .map(
    (slug) =>
      `import { contentScenes as ${importName(slug)}Scenes, checkpointScenes as ${importName(slug)}Checkpoints } from "@/lib/data/categories/${slug}";`
  )
  .join("\n");
const spreadSuffix = (suffix) =>
  moduleNames.map((slug) => `  ...${importName(slug)}${suffix},`).join("\n");

fs.writeFileSync(
  path.join(dataDir, "scenes.ts"),
  `import type { CheckpointScene, ContentScene, FeedScene } from "@/lib/types";
${sceneImports}

export const contentScenes: ContentScene[] = [
${spreadSuffix("Scenes")}
];

export const checkpointScenes: CheckpointScene[] = [
${spreadSuffix("Checkpoints")}
];

const checkpointByTopic = new Map(checkpointScenes.map((c) => [c.topicId, c]));

/** First topic a phrase appears in — used to route "due for review" back into a feed. */
export const topicIdByPhraseId = new Map<string, string>();
for (const s of contentScenes) {
  if (!topicIdByPhraseId.has(s.phraseId)) topicIdByPhraseId.set(s.phraseId, s.topicId);
}

/**
 * Builds the feed for a topic: its content scenes in order, with the topic's
 * checkpoint (if any) inserted after the second scene — always after the
 * scene that introduces the checkpoint's phrase.
 */
export function buildFeed(topicId: string): FeedScene[] {
  const scenes = contentScenes.filter((s) => s.topicId === topicId);
  const checkpoint = checkpointByTopic.get(topicId);
  if (!checkpoint) return scenes;

  const feed: FeedScene[] = [];
  let inserted = false;
  for (const scene of scenes) {
    feed.push(scene);
    // insert once the phrase has been seen and at least 2 scenes have passed
    const phraseSeen = feed.some(
      (s) => s.type === "content" && s.phraseId === checkpoint.phraseId
    );
    if (!inserted && feed.length >= 2 && phraseSeen) {
      feed.push(checkpoint);
      inserted = true;
    }
  }
  if (!inserted) feed.push(checkpoint);
  return feed;
}
`
);

console.log("wrote barrels: phrases.ts, topics.ts, scenes.ts");
