"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, BellRing, Ear, Lock, Mic, MicOff, PhoneOff, ShieldCheck, Sparkles } from "lucide-react";
import { api, setDeviceToken } from "@/lib/client/api";
import { useHousehold } from "@/lib/client/household";
import { requestMicrophone } from "@/lib/client/speech";
import { ContactEditor, type EditableContact } from "@/components/ContactEditor";
import { LanguageGrid } from "@/components/LanguageGrid";
import { LogoMark } from "@/components/Logo";
import { Button, Card, Notice, cx } from "@/components/ui";
import type { AlertConsent, PublicHousehold } from "@/lib/types";

const STEPS = ["welcome", "language", "name", "mic", "contacts", "privacy", "ready"] as const;
type Step = (typeof STEPS)[number];

export default function Welcome() {
  const router = useRouter();
  const { language, setLanguage, setHousehold, status, t } = useHousehold();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [mic, setMic] = useState<"unknown" | "granted" | "denied" | "unsupported" | "asking">("unknown");
  const [contacts, setContacts] = useState<EditableContact[]>([]);
  const [consent, setConsent] = useState<AlertConsent>("ask");
  const [providerLive, setProviderLive] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "ready" || status === "offline") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    api<{ notifications: { live: boolean } }>("/api/status")
      .then((d) => setProviderLive(d.notifications.live))
      .catch(() => setProviderLive(null));
  }, []);

  const idx = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(idx + 1, STEPS.length - 1)]);
  const back = () => setStep(STEPS[Math.max(idx - 1, 0)]);

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ deviceToken: string; household: PublicHousehold }>("/api/household", {
        body: {
          elderName: name.trim() || undefined,
          language,
          alertConsent: consent,
          contacts: contacts.map(({ name, phone, relation }) => ({ name, phone, relation })),
        },
      });
      setDeviceToken(res.deviceToken);
      setHousehold(res.household);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't finish setup.");
      setSaving(false);
    }
  }

  return (
    <main id="main" className="grain mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-8 pt-5">
      <header className="flex h-14 items-center justify-between">
        {idx > 0 ? (
          <button onClick={back} className="-ml-2 inline-flex min-h-[48px] items-center gap-2 rounded-xl px-2 font-semibold text-navy-soft hover:bg-navy/5">
            <ArrowLeft className="h-5 w-5" aria-hidden /> Back
          </button>
        ) : (
          <span />
        )}
        {idx > 0 && idx < STEPS.length - 1 && (
          <div className="flex gap-1.5" aria-label={`Step ${idx} of ${STEPS.length - 2}`}>
            {STEPS.slice(1, -1).map((s, i) => (
              <span key={s} className={cx("h-2 rounded-full transition-all", i < idx ? "w-6 bg-lavender-deep" : "w-2 bg-lavender/30")} />
            ))}
          </div>
        )}
      </header>

      <div key={step} className="flex flex-1 animate-rise flex-col">
        {step === "welcome" && (
          <>
            <div className="mt-6 flex flex-col items-center text-center">
              <LogoMark size={88} />
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight">Ruko</h1>
              <p className="mt-2 text-2xl font-semibold text-lavender-deep">Pause. Breathe. Verify.</p>
              <p className="mt-4 max-w-sm text-lg text-navy-soft">A calm second voice for the moment a frightening call makes it hard to think.</p>
            </div>
            <Card className="mt-8 space-y-5 p-6">
              {[
                { Icon: Mic, title: "Press one big button", body: "Tell Ruko what happened, in your own language." },
                { Icon: Ear, title: "Ruko listens and asks 2–3 simple questions", body: "You can answer by speaking or tapping Yes / No." },
                { Icon: ShieldCheck, title: "Ruko checks for known scam patterns", body: "And tells you clearly what to do next." },
                { Icon: BellRing, title: "Your family can be told — only if you agree", body: "So you never have to face it alone." },
              ].map(({ Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lavender-soft text-lavender-deep">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-base text-navy-soft">{body}</p>
                  </div>
                </div>
              ))}
            </Card>
            <div className="mt-auto space-y-3 pt-8">
              <Button size="xl" className="w-full" onClick={next}>
                Get started
              </Button>
              <Link href="/help?demo=1" className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl font-semibold text-lavender-deep hover:bg-lavender-soft">
                <Sparkles className="h-5 w-5" aria-hidden /> Try the demo first
              </Link>
              <Link href="/family" className="block text-center text-base font-medium text-navy-soft underline-offset-4 hover:underline">
                I’m a family member — open the family dashboard
              </Link>
            </div>
          </>
        )}

        {step === "language" && (
          <>
            <StepTitle eyebrow="Language" title="Which language do you speak most comfortably?" sub="Ruko will listen and speak in this language. You can change it any time." />
            <LanguageGrid value={language} onChange={(l) => void setLanguage(l)} />
            <p className="mt-5 rounded-2xl bg-white/70 p-4 text-center text-lg" lang={language}>
              {t("greeting")}
            </p>
            <StepActions onNext={next} />
          </>
        )}

        {step === "name" && (
          <>
            <StepTitle eyebrow="About you" title="What should Ruko call you?" sub="Optional. This is shown on your home screen and in the message to your family." />
            <label className="label" htmlFor="elder-name">Your name</label>
            <input id="elder-name" className="field text-xl" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lakshmi Amma" maxLength={60} autoComplete="name" />
            <StepActions onNext={next} nextLabel={name.trim() ? "Continue" : "Skip"} />
          </>
        )}

        {step === "mic" && (
          <>
            <StepTitle eyebrow="Microphone" title="Let Ruko hear you" sub="Ruko only listens after you press the big button, and stops when you finish." />
            <Card className="space-y-4 p-5">
              <Row Icon={PhoneOff} text="Ruko never records your phone calls and never listens in the background." />
              <Row Icon={Lock} text="What you say is checked on this phone. Your words are not saved." />
            </Card>
            <div className="mt-6">
              {mic === "granted" && <Notice tone="ok" title="Microphone is ready">Thank you. You can now speak to Ruko.</Notice>}
              {mic === "denied" && (
                <Notice tone="warn" title="Microphone was blocked">
                  That’s okay — you can still answer by tapping big buttons. To allow it later, open your browser’s site settings and allow the microphone.
                </Notice>
              )}
              {mic === "unsupported" && <Notice tone="info" title="Voice isn’t available here">This browser can’t use the microphone. You’ll answer by tapping buttons instead.</Notice>}
            </div>
            <div className="mt-auto space-y-3 pt-8">
              {mic !== "granted" && (
                <Button
                  size="xl"
                  className="w-full"
                  icon={<Mic className="h-6 w-6" />}
                  loading={mic === "asking"}
                  onClick={async () => {
                    setMic("asking");
                    setMic(await requestMicrophone());
                  }}
                >
                  Allow microphone
                </Button>
              )}
              <Button size="lg" variant={mic === "granted" ? "primary" : "ghost"} className="w-full" icon={mic === "granted" ? undefined : <MicOff className="h-5 w-5" />} onClick={next}>
                {mic === "granted" ? "Continue" : "Skip — I’ll tap my answers"}
              </Button>
            </div>
          </>
        )}

        {step === "contacts" && (
          <>
            <StepTitle eyebrow="Trusted family" title="Who should Ruko tell if a call looks like a scam?" sub="Add up to 5 people. The first person is told first. Numbers are stored encrypted." />
            <ContactEditor
              contacts={contacts}
              onAdd={async (c) => setContacts((cs) => [...cs, { ...c, id: crypto.randomUUID(), priority: cs.length + 1 }])}
              onRemove={async (id) => setContacts((cs) => cs.filter((x) => x.id !== id).map((x, i) => ({ ...x, priority: i + 1 })))}
              onMove={async (id, dir) =>
                setContacts((cs) => {
                  const list = [...cs].sort((a, b) => a.priority - b.priority);
                  const i = list.findIndex((x) => x.id === id);
                  const j = dir === "up" ? i - 1 : i + 1;
                  if (j < 0 || j >= list.length) return cs;
                  [list[i], list[j]] = [list[j], list[i]];
                  return list.map((x, k) => ({ ...x, priority: k + 1 }));
                })
              }
            />
            {contacts.length === 0 && <p className="mt-4 text-base text-navy-soft">You can skip this and add family later in Settings, but Ruko won’t be able to alert anyone until you do.</p>}
            <StepActions onNext={next} nextLabel={contacts.length ? "Continue" : "Skip for now"} />
          </>
        )}

        {step === "privacy" && (
          <>
            <StepTitle eyebrow="Your choice" title="When should Ruko tell your family?" sub="Ruko sends a short message — never what you said, never any bank details." />
            <div role="radiogroup" className="space-y-3">
              {(
                [
                  ["ask", "Ask me each time", "Ruko asks “Shall I tell your family?” before sending. Recommended."],
                  ["always", "Tell them automatically", "If a scam pattern is found, Ruko alerts your family straight away."],
                  ["never", "Never send alerts", "Ruko will only guide you. You can still call family yourself."],
                ] as [AlertConsent, string, string][]
              ).map(([v, title, body]) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={consent === v}
                  onClick={() => setConsent(v)}
                  className={cx("w-full rounded-2xl border-2 p-4 text-left transition", consent === v ? "border-lavender-deep bg-lavender-soft" : "border-line bg-white hover:border-lavender/60")}
                >
                  <span className="flex items-center gap-3">
                    <span className={cx("h-5 w-5 shrink-0 rounded-full border-2", consent === v ? "border-lavender-deep bg-lavender-deep shadow-[inset_0_0_0_3px_white]" : "border-navy-faint")} aria-hidden />
                    <span className="font-semibold">{title}</span>
                  </span>
                  <span className="mt-1 block pl-8 text-base text-navy-soft">{body}</span>
                </button>
              ))}
            </div>
            <Card className="mt-5 space-y-2 p-5 text-base text-navy-soft">
              <p className="font-semibold text-navy">Our promises</p>
              <p>• Ruko never asks for your Aadhaar number, OTP, PIN or bank details.</p>
              <p>• Ruko never records calls or listens in the background.</p>
              <p>• Ruko never talks to the caller or controls your phone.</p>
              <p>
                • You can delete all your data any time. <Link href="/privacy" className="font-semibold text-lavender-deep underline">Privacy policy</Link>
              </p>
            </Card>
            {providerLive === false && (
              <Notice className="mt-4" tone="info" title="Demo mode">
                Text-message alerts aren’t connected on this server yet. Ruko will show alerts in the family dashboard and say clearly that no real message was sent.
              </Notice>
            )}
            <StepActions onNext={next} />
          </>
        )}

        {step === "ready" && (
          <>
            <div className="mt-10 flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sage">
                <ShieldCheck className="h-12 w-12 text-sage-deep" aria-hidden />
              </div>
              <h1 className="mt-6 text-3xl font-bold">You’re all set{name.trim() ? `, ${name.trim()}` : ""}.</h1>
              <p className="mt-3 max-w-sm text-lg text-navy-soft">Whenever a call frightens you, open Ruko and press the big button. Ruko will help you pause and check.</p>
            </div>
            <Card className="mt-8 p-5 text-base">
              <p className="font-semibold">Family member helping set this up?</p>
              <p className="mt-1 text-navy-soft">After setup, open Settings → “Connect family dashboard” to get a 6-digit code for your own dashboard.</p>
            </Card>
            {error && <Notice className="mt-4" tone="warn" title="Couldn’t finish setup">{error}</Notice>}
            <div className="mt-auto pt-8">
              <Button size="xl" className="w-full" loading={saving} onClick={finish}>
                Start using Ruko
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StepTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-6 mt-4">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-[1.75rem] font-bold leading-tight">{title}</h1>
      {sub && <p className="mt-2 text-lg text-navy-soft">{sub}</p>}
    </div>
  );
}

function StepActions({ onNext, nextLabel = "Continue" }: { onNext: () => void; nextLabel?: string }) {
  return (
    <div className="mt-auto pt-8">
      <Button size="xl" className="w-full" onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}

function Row({ Icon, text }: { Icon: typeof Mic; text: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-lavender-deep" aria-hidden />
      <p>{text}</p>
    </div>
  );
}
