import { getBackend } from "@/lib/storage/backend";

/**
 * Debounced, latest-wins write coalescing. Rapid swipes update the deck
 * document many times per second; only the last serialization per key is
 * persisted. Flushes on tab hide so learning results survive navigation.
 */

const DEBOUNCE_MS = 300;

const pending = new Map<string, string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

async function writeKey(key: string): Promise<void> {
  const value = pending.get(key);
  if (value === undefined) return;
  pending.delete(key);
  try {
    const backend = await getBackend();
    await backend.set(key, value);
  } catch {
    // storage is a nice-to-have, never crash the app
  }
}

export function queueWrite(key: string, serialized: string): void {
  pending.set(key, serialized);
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      void writeKey(key);
    }, DEBOUNCE_MS)
  );
}

export async function flushWrites(): Promise<void> {
  for (const [key, timer] of timers) {
    clearTimeout(timer);
    timers.delete(key);
  }
  await Promise.all([...pending.keys()].map(writeKey));
}

let flushListenersInstalled = false;

/** Idempotent: flush pending writes when the tab is hidden or unloading. */
export function installFlushListeners(): void {
  if (flushListenersInstalled || typeof window === "undefined") return;
  flushListenersInstalled = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushWrites();
  });
  window.addEventListener("pagehide", () => {
    void flushWrites();
  });
}
