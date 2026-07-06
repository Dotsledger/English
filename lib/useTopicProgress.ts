"use client";

import { useCallback, useEffect, useState } from "react";
import type { TopicProgressStore } from "@/lib/topicProgress";
import { loadTopicProgress, markCompleted, saveTopicProgress } from "@/lib/topicProgress";

export function useTopicProgress() {
  const [store, setStore] = useState<TopicProgressStore>({});

  useEffect(() => {
    // localStorage is only readable after mount; initializing state from it
    // during render would mismatch the server-rendered HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStore(loadTopicProgress());
  }, []);

  const markTopicCompleted = useCallback((topicId: string) => {
    setStore((prev) => {
      const next = markCompleted(prev, topicId);
      if (next !== prev) saveTopicProgress(next);
      return next;
    });
  }, []);

  return { store, markTopicCompleted };
}
