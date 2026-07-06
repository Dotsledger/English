export const TOPIC_PROGRESS_KEY = "sticky-english.completed-topics.v1";

export type TopicProgressStore = Record<string, true>;

function isValidStore(value: unknown): value is TopicProgressStore {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((v) => v === true);
}

/** Parses raw localStorage content; corrupted data falls back to an empty store. */
export function parseTopicProgress(raw: string | null): TopicProgressStore {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidStore(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function loadTopicProgress(): TopicProgressStore {
  if (typeof window === "undefined") return {};
  try {
    return parseTopicProgress(window.localStorage.getItem(TOPIC_PROGRESS_KEY));
  } catch {
    return {};
  }
}

export function saveTopicProgress(store: TopicProgressStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOPIC_PROGRESS_KEY, JSON.stringify(store));
  } catch {
    // storage full or unavailable — progress is a nice-to-have, never crash the feed
  }
}

export function markCompleted(store: TopicProgressStore, topicId: string): TopicProgressStore {
  if (store[topicId]) return store;
  return { ...store, [topicId]: true };
}

export function isCompleted(store: TopicProgressStore, topicId: string): boolean {
  return store[topicId] === true;
}
