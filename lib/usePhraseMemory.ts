"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhraseMemoryStore, PhraseStatus } from "@/lib/types";
import {
  loadStore,
  recordAttempt,
  recordSeen,
  saveStore,
  statusOf,
} from "@/lib/phraseMemory";

export function usePhraseMemory() {
  const [store, setStore] = useState<PhraseMemoryStore>({});
  const seenSceneIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // localStorage is only readable after mount; initializing state from it
    // during render would mismatch the server-rendered HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStore(loadStore());
  }, []);

  const markSeen = useCallback((phraseId: string, sceneId: string) => {
    setStore((prev) => {
      const next = recordSeen(prev, phraseId, sceneId, seenSceneIds.current);
      if (next !== prev) saveStore(next);
      return next;
    });
  }, []);

  const markAttempt = useCallback((phraseId: string, correct: boolean) => {
    setStore((prev) => {
      const next = recordAttempt(prev, phraseId, correct);
      saveStore(next);
      return next;
    });
  }, []);

  const getStatus = useCallback(
    (phraseId: string): PhraseStatus => statusOf(store, phraseId),
    [store]
  );

  return { store, markSeen, markAttempt, getStatus };
}
