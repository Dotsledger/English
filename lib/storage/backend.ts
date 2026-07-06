/**
 * Key–value storage backends. Values are always JSON strings, so the three
 * backends (IndexedDB, localStorage, in-memory) are interchangeable and the
 * corruption-safe `parse*(raw: string | null)` functions work on all of them.
 *
 * The IndexedDB database version stays at 1 forever — logical schema
 * evolution is tracked in the meta document (see keys.ts), never through
 * IDB's versionchange machinery.
 */

export type StorageBackend = {
  readonly kind: "idb" | "localStorage" | "memory";
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
};

export function createMemoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return {
    kind: "memory",
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
    async keys() {
      return [...map.keys()];
    },
  };
}

export function createLocalStorageBackend(): StorageBackend | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = "sticky-english.probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
  } catch {
    return null;
  }
  return {
    kind: "localStorage",
    async get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // storage full or unavailable — memory is a nice-to-have, never crash
      }
    },
    async remove(key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
    async keys() {
      try {
        return Object.keys(window.localStorage);
      } catch {
        return [];
      }
    },
  };
}

const DB_NAME = "sticky-english";
const STORE = "kv";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function createIdbBackend(): Promise<StorageBackend | null> {
  if (typeof indexedDB === "undefined") return null;
  let db: IDBDatabase;
  try {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore(STORE);
    };
    db = await requestToPromise(open);
  } catch {
    return null;
  }

  const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);

  const backend: StorageBackend = {
    kind: "idb",
    async get(key) {
      const result = await requestToPromise(tx("readonly").get(key));
      return typeof result === "string" ? result : null;
    },
    async set(key, value) {
      await requestToPromise(tx("readwrite").put(value, key));
    },
    async remove(key) {
      await requestToPromise(tx("readwrite").delete(key));
    },
    async keys() {
      const result = await requestToPromise(tx("readonly").getAllKeys());
      return result.filter((k): k is string => typeof k === "string");
    },
  };

  // Safari legacy private mode opens the DB but throws on first transaction —
  // probe once so the fallback decision happens here, not mid-session.
  try {
    await backend.set("sticky-english.probe", "1");
    await backend.remove("sticky-english.probe");
  } catch {
    return null;
  }
  return backend;
}

let backendPromise: Promise<StorageBackend> | null = null;

/** Memoized. IDB → localStorage → memory. Safe anywhere; memory on SSR. */
export function getBackend(): Promise<StorageBackend> {
  if (!backendPromise) {
    backendPromise = (async () => {
      if (typeof window === "undefined") return createMemoryBackend();
      return (await createIdbBackend()) ?? createLocalStorageBackend() ?? createMemoryBackend();
    })();
  }
  return backendPromise;
}

/** Test-only: forget the memoized backend so the next getBackend() re-decides. */
export function resetBackendForTests(): void {
  backendPromise = null;
}
