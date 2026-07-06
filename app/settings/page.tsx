"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useCaptures, useDeck, useSentences } from "@/components/AppStateProvider";
import { exportAll, importAll } from "@/lib/storage/exportImport";
import { getBackend } from "@/lib/storage/backend";
import { ALL_KEYS } from "@/lib/storage/keys";
import { localIsoDate } from "@/lib/dates";
import { phraseById } from "@/lib/data/phrases";

export default function SettingsPage() {
  const deck = useDeck();
  const captures = useCaptures();
  const sentences = useSentences();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sentenceEntries = Object.entries(sentences.value).filter(([, list]) => list.length > 0);

  const phraseCount = Object.keys(deck.value).length;
  const captureCount = Object.keys(captures.value).length;

  const handleExport = async () => {
    const bundle = await exportAll();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sticky-english-${localIsoDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const raw = await file.text();
    const result = await importAll(raw);
    if (result.ok) {
      // Full reload so every provider doc re-hydrates from storage.
      window.location.href = "/";
    } else {
      setMessage(result.error);
    }
  };

  const handleWipe = async () => {
    if (!window.confirm("¿Borrar todo tu progreso? Esto no se puede deshacer.")) return;
    const backend = await getBackend();
    for (const key of ALL_KEYS) await backend.remove(key);
    window.location.href = "/";
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Volver al inicio"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/60"
        >
          ←
        </Link>
        <h1 className="text-2xl font-bold text-white">Ajustes</h1>
      </header>

      <section className="rounded-2xl bg-white/[0.05] px-4 py-3.5">
        <p className="text-sm text-white/70">
          {deck.ready
            ? `${phraseCount} frases con progreso · ${captureCount} capturadas`
            : "Cargando…"}
        </p>
        <p className="mt-1 text-xs text-white/40">
          Tu progreso vive solo en este dispositivo. Exporta una copia si cambias de móvil o
          limpias el navegador.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleExport}
          data-testid="export-progress"
          className="rounded-2xl bg-white px-5 py-4 text-base font-semibold text-black active:scale-[0.99]"
        >
          Exportar mi progreso (JSON)
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          data-testid="import-progress"
          className="rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-4 text-base font-medium text-white active:scale-[0.99]"
        >
          Importar una copia
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
          }}
        />
        {message && <p className="px-1 text-sm text-amber-300">{message}</p>}
      </section>

      {sentenceEntries.length > 0 && (
        <section className="flex flex-col gap-2" data-testid="my-sentences">
          <h2 className="px-1 text-sm font-semibold text-white/70">Tus frases</h2>
          <div className="flex flex-col gap-2">
            {sentenceEntries.map(([phraseId, list]) => (
              <div key={phraseId} className="rounded-2xl bg-white/[0.05] px-4 py-3">
                <p className="text-sm font-medium text-white">
                  {phraseById.get(phraseId)?.text ?? phraseId}
                </p>
                <ul className="mt-1 flex flex-col gap-1">
                  {list.map((s, i) => (
                    <li key={i} className="text-sm text-white/55">
                      “{s.text}”
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-auto">
        <button
          type="button"
          onClick={handleWipe}
          className="w-full rounded-2xl border border-rose-400/25 px-5 py-3.5 text-sm font-medium text-rose-300/80 active:scale-[0.99]"
        >
          Borrar todo
        </button>
      </section>
    </main>
  );
}
