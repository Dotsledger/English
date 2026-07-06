"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ActivityStore,
  CaptureStore,
  DeckStore,
  MissionStore,
  SentenceStore,
  TriageStore,
} from "@/lib/types";
import { getBackend } from "@/lib/storage/backend";
import { ensureMigrated } from "@/lib/storage/migrate";
import { installFlushListeners, queueWrite } from "@/lib/storage/writeQueue";
import {
  KEY_ACTIVITY,
  KEY_CAPTURES,
  KEY_DECK,
  KEY_MISSION,
  KEY_SENTENCES,
  KEY_TOPICS,
  KEY_TRIAGE,
} from "@/lib/storage/keys";
import {
  parseActivity,
  parseCaptures,
  parseDeck,
  parseMission,
  parseSentences,
  parseTopics,
  parseTriage,
} from "@/lib/storage/docs";

export type Doc<T> = {
  value: T;
  /** False until the first async load resolves. Gate skeletons on this;
   * recording updates before it are queued and re-applied, never lost. */
  ready: boolean;
  update: (fn: (prev: T) => T) => void;
};

let migrationOnce: Promise<void> | null = null;
function migrateOnce(): Promise<void> {
  if (!migrationOnce) {
    migrationOnce = getBackend().then((backend) => ensureMigrated(backend));
  }
  return migrationOnce;
}

/** Test-only: forget the memoized migration so a fresh test re-runs it. */
export function resetMigrationForTests(): void {
  migrationOnce = null;
}

function usePersistedDoc<T>(key: string, parse: (raw: string | null) => T): Doc<T> {
  const [value, setValue] = useState<T>(() => parse(null));
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const pendingRef = useRef<Array<(prev: T) => T>>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await migrateOnce();
      const backend = await getBackend();
      const raw = await backend.get(key);
      if (cancelled) return;
      let loaded = parse(raw);
      // Race guard: updates fired before the load resolved re-apply on top.
      const queued = pendingRef.current;
      pendingRef.current = [];
      for (const fn of queued) loaded = fn(loaded);
      if (queued.length > 0) queueWrite(key, JSON.stringify(loaded));
      readyRef.current = true;
      setValue(loaded);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // parse is a module-level pure function, stable by construction
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (fn: (prev: T) => T) => {
      if (!readyRef.current) {
        pendingRef.current.push(fn);
        setValue((prev) => fn(prev)); // optimistic even before hydration
        return;
      }
      setValue((prev) => {
        const next = fn(prev);
        queueWrite(key, JSON.stringify(next));
        return next;
      });
    },
    [key]
  );

  return { value, ready, update };
}

type AppState = {
  deck: Doc<DeckStore>;
  completedTopics: Doc<Record<string, true>>;
  captures: Doc<CaptureStore>;
  activity: Doc<ActivityStore>;
  mission: Doc<MissionStore | null>;
  triage: Doc<TriageStore>;
  sentences: Doc<SentenceStore>;
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const deck = usePersistedDoc(KEY_DECK, parseDeck);
  const completedTopics = usePersistedDoc(KEY_TOPICS, parseTopics);
  const captures = usePersistedDoc(KEY_CAPTURES, parseCaptures);
  const activity = usePersistedDoc(KEY_ACTIVITY, parseActivity);
  const mission = usePersistedDoc(KEY_MISSION, parseMission);
  const triage = usePersistedDoc(KEY_TRIAGE, parseTriage);
  const sentences = usePersistedDoc(KEY_SENTENCES, parseSentences);

  useEffect(() => {
    installFlushListeners();
  }, []);

  return (
    <AppStateContext.Provider
      value={{ deck, completedTopics, captures, activity, mission, triage, sentences }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used inside <AppStateProvider>");
  return context;
}

export function useDeck(): Doc<DeckStore> {
  return useAppState().deck;
}

export function useCompletedTopics(): Doc<Record<string, true>> {
  return useAppState().completedTopics;
}

export function useCaptures(): Doc<CaptureStore> {
  return useAppState().captures;
}

export function useActivity(): Doc<ActivityStore> {
  return useAppState().activity;
}

export function useMission(): Doc<MissionStore | null> {
  return useAppState().mission;
}

export function useTriage(): Doc<TriageStore> {
  return useAppState().triage;
}

export function useSentences(): Doc<SentenceStore> {
  return useAppState().sentences;
}
