import type { ContentScene, Phrase } from "@/lib/types";

/** All user-visible English text of a scene, joined for phrase matching. */
export function sceneVisibleText(scene: ContentScene): string {
  switch (scene.sceneType) {
    case "hero_image":
      return [scene.hook, scene.body, scene.payoff ?? ""].join("\n");
    case "editorial_poster":
      return [scene.hook, scene.body].join("\n");
    case "chat":
      return scene.messages.map((m) => m.text).join("\n");
    case "myth_vs_reality":
      return [scene.myth, scene.reality].join("\n");
    case "price_breakdown":
      return [scene.title, ...scene.rows.map((r) => `${r.label} ${r.value}`), scene.punchline].join("\n");
    case "red_flag":
      return [scene.flag, scene.detail].join("\n");
    case "mini_story":
      return scene.beats.join("\n");
    case "decision":
      return [scene.question, ...scene.options, scene.takeaway].join("\n");
    case "checklist":
      return [scene.title, ...scene.items].join("\n");
    case "news_alert":
      return [scene.headline, scene.detail, scene.consequence].join("\n");
  }
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[‘’']/g, "'").replace(/\s+/g, " ");

/** True if the phrase (or an accepted natural variant) appears in the text. */
export function phraseAppearsIn(text: string, phrase: Phrase): boolean {
  const haystack = normalize(text);
  const candidates = [phrase.text, ...(phrase.variants ?? [])];
  return candidates.some((c) => haystack.includes(normalize(c)));
}
