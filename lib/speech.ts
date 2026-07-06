/** Web Speech API SpeechRecognition wrapper — British English,
 * feature-detected, with a safe no-op fallback. Chrome/Edge (desktop +
 * Android) support this via webkitSpeechRecognition; Safari is partial and
 * Firefox has none, so every caller must have a typed fallback. */

// Minimal shapes — the DOM lib doesn't ship SpeechRecognition types.
type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionAvailable(): boolean {
  return getCtor() !== null;
}

export type SpeechHandle = { cancel: () => void };

/**
 * Runs one recognition pass. `onResult` gets the best transcript;
 * `onError` fires on failure OR mic-permission denial (caller should fall
 * back to typed and stay there for the session). Returns a handle to cancel
 * (e.g. on unmount / soft-timer expiry). No-op when unsupported.
 */
export function recognizeOnce(opts: {
  lang?: string;
  onResult: (transcript: string) => void;
  onError: (error: string) => void;
}): SpeechHandle {
  const Ctor = getCtor();
  if (!Ctor) {
    opts.onError("unsupported");
    return { cancel: () => {} };
  }
  let done = false;
  let recognition: SpeechRecognitionLike;
  try {
    recognition = new Ctor();
  } catch {
    opts.onError("init-failed");
    return { cancel: () => {} };
  }
  recognition.lang = opts.lang ?? "en-GB";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (e) => {
    if (done) return;
    done = true;
    const transcript = e.results?.[0]?.[0]?.transcript ?? "";
    opts.onResult(transcript);
  };
  recognition.onerror = (e) => {
    if (done) return;
    done = true;
    opts.onError(e.error ?? "error");
  };

  try {
    recognition.start();
  } catch {
    if (!done) {
      done = true;
      opts.onError("start-failed");
    }
  }

  return {
    cancel: () => {
      done = true;
      try {
        recognition.abort();
      } catch {
        // already stopped
      }
    },
  };
}
