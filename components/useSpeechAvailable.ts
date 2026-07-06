"use client";

import { useEffect, useState } from "react";
import { isSpeechRecognitionAvailable } from "@/lib/speech";

/**
 * Detects SpeechRecognition support once, after mount (never mid-exercise,
 * and hydration-safe since `window` is absent on the server). When false,
 * spoken cards never appear and the typed exercise is used silently.
 */
export function useSpeechAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time startup feature detection, same pattern as useTts/hydration hooks
    setAvailable(isSpeechRecognitionAvailable());
  }, []);
  return available;
}
