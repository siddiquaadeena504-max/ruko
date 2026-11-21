"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, CheckCircle2, Hand, IndianRupee, KeyRound, Loader2, Phone, PhoneOff, ShieldAlert, Users } from "lucide-react";
import { api, getDeviceToken } from "@/lib/client/api";
import { useHousehold } from "@/lib/client/household";
import { DEMO_ACK_SEC, DEMO_CONTACTS, DEMO_ESCALATE_SEC, demoAcknowledge, demoAlert, demoEscalate } from "@/lib/client/demo";
import type { Assessment } from "@/lib/scam/engine";
import type { StringKey } from "@/lib/i18n/strings";
import type { PublicAlert, PublicSession } from "@/lib/types";
import { Button, LinkButton, Notice, cx } from "@/components/ui";

type AlertPhase = "none" | "ask" | "sending" | "active" | "declined" | "never" | "no-contacts" | "no-device" | "error";

export function ResultView({
  assessment,
  demo,
  startedAt,
  say,
}: {
  assessment: Assessment;
  demo: boolean;
  startedAt: string;
  say: (text: string) => Promise<void>;
}) {
  const { household, language, t } = useHousehold();
  const level = assessment.level;
  const ids = assessment.indicators.filter((i) => i.strength >= 0.5).map((i) => i.id);
  const contacts = demo ? DEMO_CONTACTS : [...(household?.contacts ?? [])].sort((a, b) => a.priority - b.priority);
  const primary = contacts[0];
  const deviceReady = !demo && Boolean(household) && Boolean(getDeviceToken());
  const consentMode = household?.alertConsent ?? "ask";

  const initialPhase = (): AlertPhase => {
    if (level === "unclear") return "none";
    if (contacts.length === 0) return "no-contacts";
    if (demo) return "ask";
    if (!deviceReady) return "no-device";
    if (consentMode === "never") return "never";
    if (consentMode === "always") return "sending";
    return "ask";
  };
  const [alertPhase, setAlertPhase] = useState<AlertPhase>(initialPhase);
  const [alert, setAlert] = useState<PublicAlert | null>(null);
  const [demoNote, setDemoNote] = useState(false);
  const recorded = useRef(false);

  /** Saves the session outcome (never the words) and, with consent, alerts family. */
  const record = useCallback(
    async (sendAlert: boolean) => {
      if (demo || !deviceReady) return;
      if (recorded.current && !sendAlert) return;
      recorded.current = true;
      if (sendAlert) setAlertPhase("sending");
      try {
        const res = await api<{ session: PublicSession; alert: PublicAlert | null }>("/api/sessions", {
          body: { level, indicatorIds: ids, language, startedAt, sendAlert },
        });
        if (sendAlert) {
          if (res.alert) {
            setAlert(res.alert);
            setAlertPhase("active");
          } else setAlertPhase("none");
        }
      } catch {
        recorded.current = false;
        if (sendAlert) setAlertPhase("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demo, deviceReady, level, language, startedAt],
  );

  // On arrival: speak the main message and record the session when no consent question is pending.
  useEffect(() => {
    const main = level === "unclear" ? `${t("unclearTitle")} ${t("unclearSub")}` : `${t(level === "high" ? "warnTitle" : "possibleTitle")} ${t("warnSub")} ${t("step_end")}`;
    void say(main);
    if (alertPhase === "sending") void record(true);
    else if (alertPhase !== "ask") void record(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll alert status so acknowledgement and escalation show up live.
  useEffect(() => {
    if (demo || alertPhase !== "active" || !alert || alert.status !== "pending") return;
    const id = setInterval(async () => {
      try {
        const res = await api<{ alert: PublicAlert }>(`/api/alerts/${alert.id}`);
        setAlert(res.alert);
      } catch {
        /* keep showing last known status */
      }
    }, 4000);
    return () => clearInterval(id);
  }, [demo, alertPhase, alert]);

  // Demo: simulate escalation, then acknowledgement.
  useEffect(() => {
    if (!demo || alertPhase !== "active") return;
    const a = setTimeout(() => setAlert((x) => (x && x.status === "pending" ? demoEscalate(x) : x)), DEMO_ESCALATE_SEC * 1000);
    const b = setTimeout(() => setAlert((x) => (x && x.status === "pending" ? demoAcknowledge(x) : x)), (DEMO_ESCALATE_SEC + DEMO_ACK_SEC) * 1000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [demo, alertPhase]);

  function consent(yes: boolean) {
    if (!yes) {
      setAlertPhase("declined");
      void record(false);
      return;
    }
    if (demo) {
      setAlert(demoAlert(ids));
      setAlertPhase("active");
      return;
    }
    void record(true);
  }

  const tone = level === "unclear" ? "lavender" : "coral";
  const title = level === "high" ? t("warnTitle") : level === "possible" ? t("possibleTitle") : t("unclearTitle");
  const sub = level === "unclear" ? t("unclearSub") : t("warnSub");

  return (
    <section className="flex flex-1 animate-rise flex-col pt-6">
      <div className="text-center">
        <div className={cx("mx-auto flex h-24 w-24 items-center justify-center rounded-full", tone === "coral" ? "bg-coral-soft" : "bg-lavender-soft")}>
          {tone === "coral" ? <Hand className="h-12 w-12 text-coral-dark" aria-hidden /> : <ShieldAlert className="h-12 w-12 text-lavender-deep" aria-hidden />}
        </div>
        <h1 className="mt-5 text-[2rem] font-extrabold leading-tight" role="alert">
          {title}
        </h1>
        <p className="mt-2 text-xl font-semibold text-navy-soft">{sub}</p>
      </div>

      <div className={cx("mt-6 rounded-card border p-5 text-lg font-medium", tone === "coral" ? "border-coral/50 bg-coral-soft/70" : "border-lavender/30 bg-lavender-mist")}>
        {level === "unclear" ? t("disclaimer") : t("patternLine")}
      </div>

      {/* Primary actions, placed high so they are reachable immediately. */}
      <div className="mt-6 grid gap-3">
        {primary ? (
          demo ? (
            <Button size="xl" className="min-h-[84px] w-full text-2xl" icon={<Users className="h-7 w-7" />} onClick={() => setDemoNote(true)}>
              {t("callFamily")}
            </Button>
          ) : (
            <LinkButton href={`tel:${primary.phone.replace(/\s/g, "")}`} size="xl" className="min-h-[84px] w-full text-2xl" icon={<Users className="h-7 w-7" />} aria-label={`${t("callFamily")}: ${primary.name}`}>
              {t("callFamily")}
            </LinkButton>
          )
        ) : (
          <div className="rounded-xl2 border-2 border-dashed border-line bg-white/60 p-4 text-center">
            <p className="text-xl font-bold text-navy-faint">{t("callFamily")}</p>
            <p className="mt-1 text-base text-navy-soft">{t("addContactsHint")}</p>
            {!demo && (
              <Link href="/settings#contacts" className="mt-2 inline-block font-semibold text-lavender-deep underline">
                {t("settings")}
              </Link>
            )}
          </div>
        )}
        {primary && <p className="-mt-1 text-center text-base text-navy-soft">{primary.name}{primary.relation ? ` · ${primary.relation}` : ""}</p>}
        {demo ? (
          <Button size="xl" variant="coral" className="min-h-[84px] w-full text-2xl" icon={<Phone className="h-7 w-7" />} onClick={() => setDemoNote(true)}>
            {t("call1930")}
          </Button>
        ) : (
          <LinkButton href="tel:1930" size="xl" variant="coral" className="min-h-[84px] w-full text-2xl" icon={<Phone className="h-7 w-7" />} aria-label={`${t("call1930")} — National Cyber Crime Helpline`}>
            {t("call1930")}
          </LinkButton>
        )}
        {demoNote && <Notice tone="info">{t("demoCallNote")}</Notice>}
        {contacts.length > 1 && !demo && (
          <div className="flex flex-wrap justify-center gap-2">
            {contacts.slice(1).map((c) => (
              <a key={c.id} href={`tel:${c.phone.replace(/\s/g, "")}`} className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-4 font-semibold shadow-card hover:bg-lavender-mist">
                <Phone className="h-4 w-4 text-lavender-deep" aria-hidden />
                {t("callOther", { name: c.name })}
              </a>
            ))}
          </div>
        )}
      </div>

      <AlertCard phase={alertPhase} alert={alert} demo={demo} primaryName={primary?.name ?? ""} onConsent={consent} onRetry={() => void record(true)} onDemoAck={() => setAlert((x) => (x ? demoAcknowledge(x) : x))} />

      <div className="card mt-6 p-6">
        <h2 className="text-xl font-bold">{t("stepsTitle")}</h2>
        <ul className="mt-4 space-y-4">
          {(
            [
              [PhoneOff, "step_end"],
              [IndianRupee, "step_money"],
              [KeyRound, "step_otp"],
              [Users, "step_family"],
              [Phone, "step_1930"],
            ] as [typeof Phone, StringKey][]
          ).map(([Icon, key]) => (
            <li key={key} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage text-sage-deep">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="pt-1.5 text-lg">{t(key)}</span>
            </li>
          ))}
        </ul>
      </div>

      {ids.length > 0 && (
        <div className="card mt-4 p-6">
          <h2 className="text-xl font-bold">{t("whyTitle")}</h2>
          <ul className="mt-4 space-y-3">
            {ids.map((id) => (
              <li key={id} className="flex gap-3 text-lg">
                <span className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-coral" aria-hidden />
                {t(`reason_${id}` as StringKey)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-card bg-sage/60 p-5 text-lg">
        <p className="font-semibold text-sage-deep">{t("realPolice")}</p>
      </div>

      <p className="mt-6 text-center text-xl font-medium">{t("breathe")}</p>
      {level !== "unclear" && <p className="mt-3 text-center text-base text-navy-soft">{t("disclaimer")}</p>}

      <Link href="/" className="mx-auto mt-6 inline-flex min-h-[56px] items-center rounded-2xl px-6 text-lg font-semibold text-lavender-deep hover:bg-lavender-soft">
        {t("backHome")}
      </Link>
    </section>
  );
}

function AlertCard({
  phase,
  alert,
  demo,
  primaryName,
  onConsent,
  onRetry,
  onDemoAck,
}: {
  phase: AlertPhase;
  alert: PublicAlert | null;
  demo: boolean;
  primaryName: string;
  onConsent: (yes: boolean) => void;
  onRetry: () => void;
  onDemoAck: () => void;
}) {
  const { t } = useHousehold();
  if (phase === "none" || phase === "never") return null;

  if (phase === "no-contacts" || phase === "no-device") {
    return <Notice className="mt-6" tone="info" title={phase === "no-contacts" ? t("alertNoContacts") : t("notConnected")} />;
  }

  if (phase === "ask") {
    return (
      <div className="card mt-6 border-lavender/40 p-6">
        <div className="flex items-start gap-4">
          <BellRing className="mt-1 h-7 w-7 shrink-0 text-lavender-deep" aria-hidden />
          <div>
            <h2 className="text-xl font-bold">{t("consentQ", { name: primaryName })}</h2>
            <p className="mt-1 text-base text-navy-soft">{t("consentDetail")}</p>
          </div>
        </div>
        {demo && <p className="mt-3 rounded-xl bg-lavender-mist p-3 text-base text-lavender-deep">{t("demoTapYes")}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button size="lg" onClick={() => onConsent(true)}>
            {t("consentYes")}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => onConsent(false)}>
            {t("consentNo")}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "declined") return <Notice className="mt-6" tone="info" title={t("alertDeclined")} />;

  if (phase === "sending") {
    return (
      <div className="card mt-6 flex items-center gap-3 p-5" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-lavender-deep" aria-hidden />
        <p className="text-lg font-semibold">{t("alertSending")}</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <Notice className="mt-6" tone="warn" title={t("offlineAlert")}>
        <Button size="md" variant="secondary" className="mt-3" onClick={onRetry}>
          {t("retry")}
        </Button>
      </Notice>
    );
  }

  if (!alert) return null;
  const lines = alertLines(alert, t);
  const acked = alert.status === "acknowledged";
  return (
    <div className={cx("card mt-6 p-6", acked && "border-sage-dark/30 bg-sage/40")} aria-live="polite">
      <div className="flex items-center gap-3">
        {acked ? <CheckCircle2 className="h-7 w-7 text-sage-deep" aria-hidden /> : <BellRing className="h-7 w-7 text-lavender-deep" aria-hidden />}
        <h2 className="text-xl font-bold">{acked ? t("alertAck", { name: alert.acknowledgedBy ?? "" }) : lines.headline}</h2>
      </div>
      <ul className="mt-3 space-y-1.5 text-base text-navy-soft">
        {lines.details.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
      {!alert.providerLive && <p className="mt-3 rounded-xl bg-coral-soft p-3 text-base font-medium text-navy">{t("alertSimulated")}</p>}
      {demo && !acked && (
        <Button size="md" variant="secondary" className="mt-4" onClick={onDemoAck}>
          {t("demoAckButton")}
        </Button>
      )}
    </div>
  );
}

/** Turns delivery records into honest, plain-language status lines. */
function alertLines(alert: PublicAlert, t: ReturnType<typeof useHousehold>["t"]) {
  const details: string[] = [];
  alert.deliveries.forEach((d, i) => {
    if (d.status === "failed") details.push(t("alertCouldNotReach", { name: d.contactName }));
    else if (i === 0) details.push(d.status === "sent" ? t("alertSent", { name: d.contactName }) : `${d.contactName} — ${t("demoBadge")}`);
    else details.push(t("alertEscalated", { name: d.contactName }));
  });
  const last = [...alert.deliveries].reverse().find((d) => d.status !== "failed");
  let headline: string;
  if (alert.status === "not_sent" || !last) headline = t("alertFailed");
  else if (alert.status === "exhausted") headline = t("alertExhausted");
  else headline = t("alertWaiting", { name: last.contactName });
  return { headline, details };
}
