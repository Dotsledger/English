import type { EditorialPosterScene as EditorialPosterSceneType, Phrase } from "@/lib/types";
import { HighlightPhrase } from "@/components/HighlightPhrase";

export function EditorialPosterScene({
  scene,
  phrase,
}: {
  scene: EditorialPosterSceneType;
  phrase: Phrase;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="whitespace-pre-line text-[2.4rem] font-extrabold leading-[1.08] tracking-tight text-white">
        <HighlightPhrase text={scene.hook} phrase={phrase} />
      </h2>
      <p className="whitespace-pre-line text-[1.7rem] font-semibold leading-[1.2] text-white/80">
        <HighlightPhrase text={scene.body} phrase={phrase} />
      </p>
    </div>
  );
}
