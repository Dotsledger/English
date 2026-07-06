import type { ChatScene as ChatSceneType, Phrase } from "@/lib/types";
import { HighlightPhrase } from "@/components/HighlightPhrase";

export function ChatScene({ scene, phrase }: { scene: ChatSceneType; phrase: Phrase }) {
  const firstSpeaker = scene.messages[0]?.speaker;

  return (
    <div className="flex flex-col gap-3">
      {scene.messages.map((m, i) => {
        const isLeft = m.speaker === firstSpeaker;
        return (
          <div key={i} className={`flex flex-col ${isLeft ? "items-start" : "items-end"}`}>
            <span className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-white/45">
              {m.speaker}
            </span>
            <p
              className={`max-w-[85%] whitespace-pre-line rounded-3xl px-4 py-3 text-[1.05rem] leading-snug ${
                isLeft
                  ? "rounded-bl-md bg-white/10 text-white"
                  : "rounded-br-md bg-sky-500/90 text-white"
              }`}
            >
              <HighlightPhrase text={m.text} phrase={phrase} />
            </p>
          </div>
        );
      })}
    </div>
  );
}
