"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HelpCircle, MicOff, Volume2, VolumeX, X } from "lucide-react";
import { useHousehold } from "@/lib/client/household";
import { cancelSpeech, speak, useSpeechRecognition } from "@/lib/client/speech";
import { demoStory } from "@/lib/client/demo";
import { languageInfo } from "@/lib/i18n/languages";
import { assess, chooseQuestions, detectFromSpeech, interpretAnswer } from "@/lib/scam/engine";
import type { IndicatorId } from "@/lib/scam/indicators";
import type { AnswerValue } from "@/lib/types";
import type { StringKey } from "@/lib/i18n/strings";
import { LogoMark } from "@/components/Logo";
import { Waveform } from "@/components/Waveform";
import { Button, Notice, Pill, cx } from "@/components/ui";
import { ResultView } from "./ResultView";

type Phase = "listen" | "thinking" | "questions" | "result";

const SILENCE_AUTO_FINISH_MS = 7000;

export function HelpSession({ demo }: { demo: boolean }) {
  const { household, language, t } = useHousehold();
  const lang = languageInfo(language);
  const speech = useSpeechRecognition(lang.speech);
  const [phase, setPhase] = useState<Phase>("listen");
  const [voiceOn, setVoiceOn] = useState(household?.voice.enabled ?? true);
  const rate = household?.voice.rate ?? "slow";
  const [heard, setHeard] = useState<IndicatorId[]>([]);
  const [questions, setQuestions] = useState<IndicatorId[]>([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<IndicatorId, AnswerValue>>>({});
  const [answerHint, setAnswerHint] = useState<string | null>(null);
  const [demoText, setDemoText] = useState("");
  const [demoAnswerShown, setDemoAnswerShown] = useState<AnswerValue | null>(null);
  const startedAt = useRef(new Date().toISOString());
  const voiceRef = useRef(voiceOn);
  voiceRef.current = voiceOn;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const say = useCallback(
    async (text: string) => {
      if (voiceRef.current) await speak(text, lang.speech, rate);
    },
    [lang.speech, rate],
  );

  const transcript = demo ? demoText : `${speech.finalText} ${speech.interim}`.trim();
  const voiceAvailable = !demo && speech.supported === true && speech.error !== "denied" && speech.error !== "unsupported";

  /* ---------------- Phase 1: listen ---------------- */

  const finishListening = useCallback(
    (text: string) => {
      if (phaseRef.current !== "listen") return;
      speech.stop();
      const found = detectFromSpeech(text);
      setHeard(found);
      setQuestions(chooseQuestions(found));
      setPhase("thinking");
      setTimeout(() => setPhase("questions"), 1300);
    },
    [speech],
  );

  // Start listening (real) or play the scripted story (demo).
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    (async () => {
      await say(t("listening"));
      if (cancelled) return;
      if (demo) {
        const story = demoStory(language);
        const words = story.text.split(" ");
        words.forEach((_, i) => timers.push(setTimeout(() => !cancelled && setDemoText(words.slice(0, i + 1).join(" ")), 600 + i * 170)));
        timers.push(setTimeout(() => !cancelled && finishListening(story.text), 600 + words.length * 170 + 1600));
      } else if (speech.supported) {
        speech.start();
      }
    })();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      cancelSpeech();
    };
    // Run once on mount (and when support is first detected).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.supported]);

  // Auto-finish after a long pause once something has been said.
  useEffect(() => {
    if (demo || phase !== "listen" || !speech.finalText) return;
    const id = setInterval(() => {
      if (Date.now() - speech.lastHeardAt > SILENCE_AUTO_FINISH_MS) finishListening(`${speech.finalText} ${speech.interim}`);
    }, 1000);
    return () => clearInterval(id);
  }, [demo, phase, speech.finalText, speech.interim, speech.lastHeardAt, finishListening]);

  /* ---------------- Phase 2: questions ---------------- */

  const currentQ = questions[qi];
  const answer = useCallback(
    (v: AnswerValue) => {
      if (phaseRef.current !== "questions" || !currentQ) return;
      speech.stop();
      cancelSpeech();
      setAnswerHint(null);
      setDemoAnswerShown(null);
      setAnswers((a) => ({ ...a, [currentQ]: v }));
      if (qi + 1 < questions.length) setQi(qi + 1);
      else setPhase("result");
    },
    [currentQ, qi, questions.length, speech],
  );

  const answerRef = useRef(answer);
  answerRef.current = answer;

  useEffect(() => {
    if (phase !== "questions" || !currentQ) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    speech.stop();
    speech.reset();
    (async () => {
      await say(t(`q_${currentQ}` as StringKey));
      if (cancelled) return;
      if (demo) {
        // Simulate the person saying "yes" after a moment; tapping a button overrides it.
        timers.push(setTimeout(() => !cancelled && setDemoAnswerShown("yes"), 1800));
        timers.push(setTimeout(() => !cancelled && answerRef.current("yes"), 3000));
      } else if (voiceAvailable) {
        speech.start((chunk) => {
          const v = interpretAnswer(chunk, lang);
          if (v) answerRef.current(v);
          else setAnswerHint(t("speechError"));
        });
      }
    })();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qi, currentQ]);

  useEffect(() => () => cancelSpeech(), []);

  const assessment = useMemo(() => (phase === "result" ? assess(heard, answers) : null), [phase, heard, answers]);

  /* ---------------- Render ---------------- */

  return (
    <main id="main" className="grain mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-8 pt-4">
      <header className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2">
          <LogoMark size={34} />
          {demo && <Pill tone="lavender">{t("demoBadge")}</Pill>}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (voiceOn) cancelSpeech();
              setVoiceOn(!voiceOn);
            }}
            className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-white px-3 text-navy shadow-card hover:bg-lavender-mist"
            aria-pressed={voiceOn}
            aria-label={voiceOn ? t("voiceOn") : t("voiceOff")}
          >
            {voiceOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </button>
          <Link href="/" onClick={() => cancelSpeech()} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-navy shadow-card hover:bg-lavender-mist" aria-label={t("endSession")}>
            <X className="h-6 w-6" />
          </Link>
        </div>
      </header>

      {phase === "listen" && (
        <section className="flex flex-1 animate-rise flex-col" aria-live="polite">
          <div className="mt-10 text-center">
            <h1 className="text-3xl font-bold leading-tight">{t("listening")}</h1>
            <p className="mt-2 text-lg text-navy-soft">{t("listeningHint")}</p>
          </div>

          <div className="relative mx-auto mt-10 flex h-44 w-44 items-center justify-center">
            <span className={cx("absolute inset-0 rounded-full bg-lavender/40", (speech.listening || demo) && "animate-breathe")} aria-hidden />
            <span className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-b from-[#9A90D2] to-lavender-deep text-white shadow-glow">
              <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
              </svg>
            </span>
          </div>
          <Waveform active={demo ? demoText.length > 0 : speech.listening} className="mt-6" />
          <p className="text-center text-base font-semibold text-lavender-deep">
            {demo || speech.listening ? t("listeningNow") : speech.supported === false ? "" : t("paused")}
          </p>

          {speech.error === "denied" && (
            <Notice className="mt-5" tone="warn" title={t("micDenied")}>
              {t("micDeniedHelp")}
            </Notice>
          )}
          {(speech.supported === false || speech.error === "unsupported") && !demo && <Notice className="mt-5" tone="info" title={t("speechUnsupported")} />}
          {speech.error === "network" && <Notice className="mt-5" tone="warn" title={t("speechError")}>Voice needs an internet connection on this browser. You can tap answers instead.</Notice>}
          {speech.error === "no-speech" && !speech.finalText && <p className="mt-4 text-center text-navy-soft">{t("noSpeech")}</p>}

          {transcript && (
            <div className="card mt-6 p-5" aria-label={t("heard")}>
              <p className="eyebrow">{t("heard")}</p>
              <p className="mt-2 text-xl leading-relaxed" lang={demo ? demoStory(language).lang : language}>
                {transcript}
              </p>
            </div>
          )}

          <div className="mt-auto space-y-3 pt-8">
            {!speech.listening && !demo && speech.supported && speech.error !== "denied" && (
              <Button size="lg" variant="secondary" className="w-full" onClick={() => speech.start()}>
                {t("tapMic")}
              </Button>
            )}
            <Button size="xl" className="w-full" onClick={() => finishListening(demo ? demoStory(language).text : transcript)}>
              {t("doneSpeaking")}
            </Button>
            {!transcript && (
              <Button size="lg" variant="ghost" className="w-full" icon={<MicOff className="h-5 w-5" />} onClick={() => finishListening("")}>
                {t("cantSpeak")}
              </Button>
            )}
          </div>
        </section>
      )}

      {phase === "thinking" && (
        <section className="flex flex-1 animate-rise flex-col items-center justify-center text-center" role="status">
          <div className="flex gap-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-4 w-4 animate-bounce rounded-full bg-lavender-deep" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="mt-6 text-2xl font-semibold">{t("thinking")}</p>
        </section>
      )}

      {phase === "questions" && currentQ && (
        <section key={currentQ} className="flex flex-1 animate-rise flex-col">
          <div className="mt-8 flex items-center justify-between">
            <p className="eyebrow">{t("questionIntro")}</p>
            <p className="text-base font-semibold text-navy-soft">{t("questionOf", { n: qi + 1, total: questions.length })}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-lavender/20" aria-hidden>
            <div className="h-full rounded-full bg-lavender-deep transition-all duration-500" style={{ width: `${((qi + 1) / questions.length) * 100}%` }} />
          </div>

          <div className="card mt-8 flex items-start gap-4 p-6">
            <HelpCircle className="mt-1 h-8 w-8 shrink-0 text-lavender-deep" aria-hidden />
            <h1 className="text-[1.65rem] font-bold leading-snug" aria-live="polite">
              {t(`q_${currentQ}` as StringKey)}
            </h1>
          </div>

          <div className="mt-6 min-h-[88px] text-center">
            {(voiceAvailable || demo) && (
              <>
                <Waveform active={demo ? true : speech.listening} className="h-12" />
                <p className="text-base text-navy-soft">{t("speakOrTap")}</p>
              </>
            )}
            {demoAnswerShown && (
              <p className="mt-2 inline-flex rounded-full bg-sage px-4 py-1.5 font-semibold text-sage-deep">
                {t("demoAnswer")}: “{t("yes")}”
              </p>
            )}
            {answerHint && <p className="mt-2 font-semibold text-coral-dark">{answerHint} {t("speakOrTap")}</p>}
            {speech.error === "denied" && <Notice tone="warn" title={t("micDenied")}>{t("micDeniedHelp")}</Notice>}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
            <Button size="xl" variant="primary" className="min-h-[96px] text-2xl" onClick={() => answer("yes")}>
              {t("yes")}
            </Button>
            <Button size="xl" variant="secondary" className="min-h-[96px] text-2xl" onClick={() => answer("no")}>
              {t("no")}
            </Button>
            <Button size="lg" variant="ghost" className="col-span-2" onClick={() => answer("unsure")}>
              {t("notSure")}
            </Button>
          </div>
        </section>
      )}

      {phase === "result" && assessment && (
        <ResultView assessment={assessment} demo={demo} startedAt={startedAt.current} say={say} />
      )}
    </main>
  );
}
