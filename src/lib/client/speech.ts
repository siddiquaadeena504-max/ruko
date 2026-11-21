"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------
 * Speech-to-text: wraps the browser Web Speech API.
 * This is the integration point for a server STT provider (e.g. Bhashini or a cloud API):
 * implement the same hook contract and swap it in.
 * ------------------------------------------------------------------ */

interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechError = "denied" | "no-speech" | "network" | "unsupported" | "other";

export function useSpeechRecognition(lang: string) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<SpeechError | null>(null);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [lastHeardAt, setLastHeardAt] = useState(0);
  const recRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false);
  const finalRef = useRef("");
  const onFinalRef = useRef<((chunk: string) => void) | null>(null);

  useEffect(() => setSupported(Boolean(getCtor())), []);

  const stop = useCallback(() => {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  const start = useCallback(
    (onFinal?: (chunk: string) => void) => {
      const Ctor = getCtor();
      if (!Ctor) {
        setError("unsupported");
        return;
      }
      onFinalRef.current = onFinal ?? null;
      try {
        recRef.current?.abort();
      } catch {}
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onstart = () => {
        setListening(true);
        setError(null);
      };
      rec.onresult = (e) => {
        let interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const text = r[0]?.transcript ?? "";
          if (r.isFinal) {
            finalRef.current = `${finalRef.current} ${text}`.trim();
            onFinalRef.current?.(text);
          } else interimText += text;
        }
        setFinalText(finalRef.current);
        setInterim(interimText);
        setLastHeardAt(Date.now());
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          wantRef.current = false;
          setError("denied");
        } else if (e.error === "no-speech") setError("no-speech");
        else if (e.error === "network") setError("network");
        else if (e.error !== "aborted") setError("other");
      };
      rec.onend = () => {
        setInterim("");
        // Browsers end recognition after silence; keep listening while the person still wants to talk.
        if (wantRef.current && recRef.current === rec) {
          try {
            rec.start();
            return;
          } catch {}
        }
        setListening(false);
      };
      recRef.current = rec;
      wantRef.current = true;
      try {
        rec.start();
      } catch {
        setError("other");
      }
    },
    [lang],
  );

  const reset = useCallback(() => {
    finalRef.current = "";
    setFinalText("");
    setInterim("");
    setError(null);
  }, []);

  useEffect(
    () => () => {
      wantRef.current = false;
      try {
        recRef.current?.abort();
      } catch {}
    },
    [],
  );

  return { supported, listening, error, finalText, interim, lastHeardAt, start, stop, reset, setError };
}

/* ------------------------------------------------------------------
 * Text-to-speech: browser speechSynthesis with graceful fallback.
 * ------------------------------------------------------------------ */

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function cancelSpeech() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/** Speaks text and resolves when finished (or after a safety timeout). Never rejects. */
export function speak(text: string, lang: string, rate: "slow" | "normal" = "slow"): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported() || !text) return resolve();
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate === "slow" ? 0.85 : 1;
    u.pitch = 1;
    const voices = synth.getVoices();
    const voice = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
    if (voice) u.voice = voice;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    u.onend = finish;
    u.onerror = finish;
    // Long safety timeout in case the browser never fires onend.
    setTimeout(finish, Math.min(20000, 2500 + text.length * 90));
    synth.speak(u);
  });
}

/** Asks for microphone access explicitly and immediately releases it. */
export async function requestMicrophone(): Promise<"granted" | "denied" | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

export async function microphoneState(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  try {
    const p = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return p.state;
  } catch {
    return "unknown";
  }
}
