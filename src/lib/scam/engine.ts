/**
 * Ruko's rules-based scam assessment engine. Pure functions, no I/O — runs on the device,
 * so nothing the person says needs to leave their phone to be assessed.
 *
 * The engine NEVER returns "safe". The lowest level is "unclear", which still tells the person
 * to verify independently.
 */
import { INDICATORS, QUESTION_PRIORITY, type IndicatorId } from "./indicators.ts";
import type { AnswerValue, RiskLevel } from "../types";

export interface DetectedIndicator {
  id: IndicatorId;
  source: "speech" | "answer";
  /** 1 = clearly present, 0.5 = "not sure". */
  strength: number;
}

export interface Assessment {
  level: RiskLevel;
  score: number;
  indicators: DetectedIndicator[];
}

const LATIN = /^[a-z0-9' .-]+$/;

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[’`]/g, "'")
    .replace(/[“”"!?,;:()[\]{}।॥]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return text.split(/[\s.]+/).filter(Boolean);
}

/**
 * Multi-word or non-Latin phrases match as substrings (Indic scripts attach suffixes);
 * single Latin words match whole tokens, so "pin" doesn't fire on "spinning" and "no" not on "know".
 */
export function matchesPhrase(text: string, toks: string[], phrase: string): boolean {
  const p = phrase.toLowerCase();
  if (p.includes(" ") || !LATIN.test(p)) return text.includes(p);
  return toks.some((t) => t === p || (p.length >= 5 && t.startsWith(p)));
}

/** Finds indicators mentioned in free speech. */
export function detectFromSpeech(transcript: string): IndicatorId[] {
  const text = normalise(transcript);
  if (!text) return [];
  const toks = tokens(text);
  return INDICATORS.filter((ind) => ind.phrases.some((p) => matchesPhrase(text, toks, p))).map((i) => i.id);
}

/** Interprets a spoken yes/no answer. Returns null if it can't tell. */
export function interpretAnswer(utterance: string, words: { yes: string[]; no: string[]; unsure: string[] }): AnswerValue | null {
  const text = normalise(utterance);
  if (!text) return null;
  const toks = tokens(text);
  // Answers are short, so match whole words (or word starts for Indic scripts, which add suffixes
  // like ஆமாங்க) — never substrings, otherwise "ना" would match inside "बताना".
  const has = (list: string[]) =>
    list.some((w) => {
      const p = w.toLowerCase();
      if (p.includes(" ")) return text.includes(p);
      return toks.some((t) => t === p || (!LATIN.test(p) && t.startsWith(p)));
    });
  if (has(words.unsure)) return "unsure";
  const y = has(words.yes);
  const n = has(words.no);
  if (y && !n) return "yes";
  if (n && !y) return "no";
  return null;
}

/** Picks 2–3 follow-up questions about things the person hasn't already mentioned. */
export function chooseQuestions(heard: IndicatorId[], max = 3): IndicatorId[] {
  const notHeard = QUESTION_PRIORITY.filter((id) => !heard.includes(id));
  const picked = notHeard.slice(0, max);
  // Always ask at least two questions; if most things were already heard, confirm the
  // most dangerous ones (money and OTP/PIN sharing).
  for (const id of ["money_demand", "credentials"] as IndicatorId[]) {
    if (picked.length >= 2) break;
    if (!picked.includes(id)) picked.push(id);
  }
  return picked.slice(0, max);
}

export function assess(heard: IndicatorId[], answers: Partial<Record<IndicatorId, AnswerValue>>): Assessment {
  const found = new Map<IndicatorId, DetectedIndicator>();
  for (const id of heard) found.set(id, { id, source: "speech", strength: 1 });
  for (const [id, ans] of Object.entries(answers) as [IndicatorId, AnswerValue][]) {
    if (ans === "yes") found.set(id, { id, source: "answer", strength: 1 });
    else if (ans === "unsure" && !found.has(id)) found.set(id, { id, source: "answer", strength: 0.5 });
    else if (ans === "no" && found.get(id)?.source === "speech") {
      // The person explicitly said no — trust them over keyword matching, but keep a trace.
      found.set(id, { id, source: "speech", strength: 0.5 });
    }
  }

  const weight = (id: IndicatorId) => INDICATORS.find((i) => i.id === id)?.weight ?? 1;
  const indicators = [...found.values()].sort((a, b) => b.strength * weight(b.id) - a.strength * weight(a.id));
  const score = indicators.reduce((s, d) => s + d.strength * weight(d.id), 0);
  const strong = (id: IndicatorId) => (found.get(id)?.strength ?? 0) >= 1;

  let level: RiskLevel = "unclear";
  const authorityThreat =
    strong("impersonation") && (strong("digital_arrest") || strong("money_demand") || strong("secrecy") || strong("credentials"));
  const pressure = strong("secrecy") && (strong("money_demand") || strong("credentials"));
  if (score >= 6 || authorityThreat || pressure || (strong("digital_arrest") && strong("video_call"))) level = "high";
  else if (score >= 2.5 || strong("money_demand") || strong("credentials") || strong("digital_arrest") || strong("secrecy")) level = "possible";

  return { level, score: Math.round(score * 10) / 10, indicators };
}
