"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, BellRing, ChevronRight, Globe, KeyRound, LayoutDashboard, Mic, Shield, Trash2, UserRound, Users, Volume2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useHousehold } from "@/lib/client/household";
import { microphoneState, requestMicrophone, speak, ttsSupported } from "@/lib/client/speech";
import { languageInfo } from "@/lib/i18n/languages";
import { ContactEditor } from "@/components/ContactEditor";
import { LanguageGrid } from "@/components/LanguageGrid";
import { Button, Card, Modal, Notice, Spinner, Toggle, cx } from "@/components/ui";
import type { AlertConsent, PublicContact, PublicHousehold } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const { status, household, language, setLanguage, setHousehold, signOutDevice, t } = useHousehold();
  const [mic, setMic] = useState<string>("unknown");
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (status === "none") router.replace("/welcome");
  }, [status, router]);
  useEffect(() => {
    void microphoneState().then(setMic);
  }, []);
  useEffect(() => {
    if (household) setName(household.elderName === "Friend" ? "" : household.elderName);
  }, [household]);

  if (status === "loading" || !household) return <Spinner label="Loading settings…" />;

  const offline = status === "offline";

  async function patch(body: Record<string, unknown>, label: string) {
    setError(null);
    setBusy(label);
    try {
      const res = await api<{ household: PublicHousehold }>("/api/household", { method: "PATCH", body });
      setHousehold(res.household);
      setSaved(label);
      setTimeout(() => setSaved((s) => (s === label ? null : s)), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(null);
    }
  }

  const setContacts = (contacts: PublicContact[]) => setHousehold({ ...household, contacts });

  return (
    <main id="main" className="mx-auto max-w-xl px-5 pb-16 pt-4">
      <header className="flex items-center gap-3">
        <Link href="/" className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-card hover:bg-lavender-mist" aria-label={t("backHome")}>
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold">{t("settings")}</h1>
      </header>

      {offline && <Notice className="mt-5" tone="warn" title="You're offline">Changes can't be saved until the internet is back. Your family numbers still work.</Notice>}
      {error && <Notice className="mt-5" tone="warn">{error}</Notice>}

      <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 text-base" aria-label="Settings sections">
        {[
          ["#language", "Language"],
          ["#voice", "Voice"],
          ["#contacts", "Contacts"],
          ["#alerts", "Alerts"],
          ["#privacy", "Privacy"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="shrink-0 rounded-full bg-white px-4 py-2 font-semibold shadow-card hover:bg-lavender-mist">
            {label}
          </a>
        ))}
      </nav>

      <Section id="language" icon={<Globe />} title="Language" sub={`Currently ${languageInfo(language).english}`}>
        <LanguageGrid value={language} onChange={(l) => void setLanguage(l).catch((e) => setError(e.message))} />
      </Section>

      <Section id="voice" icon={<Volume2 />} title="Voice" sub="Ruko can read questions and guidance aloud.">
        <Toggle checked={household.voice.enabled} onChange={(v) => patch({ voiceEnabled: v }, "voice")} label="Speak to me" description="Read questions and warnings aloud" disabled={offline} />
        <div className="mt-2 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Speaking speed">
          {(["slow", "normal"] as const).map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={household.voice.rate === r}
              onClick={() => patch({ voiceRate: r }, "voice")}
              disabled={offline}
              className={cx("min-h-[56px] rounded-2xl border-2 font-semibold", household.voice.rate === r ? "border-lavender-deep bg-lavender-soft" : "border-line bg-white")}
            >
              {r === "slow" ? "Slow & clear" : "Normal speed"}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          className="mt-3 w-full"
          disabled={!ttsSupported()}
          onClick={() => speak(t("greeting"), languageInfo(language).speech, household.voice.rate)}
          icon={<Volume2 className="h-5 w-5" />}
        >
          {ttsSupported() ? "Test the voice" : "Voice not available in this browser"}
        </Button>
        {saved === "voice" && <p className="mt-2 text-base font-semibold text-sage-deep">Saved</p>}
      </Section>

      <Section id="mic" icon={<Mic />} title="Microphone" sub="Ruko only listens after you press the help button.">
        {mic === "granted" && <Notice tone="ok" title="Microphone allowed" />}
        {mic === "denied" && <Notice tone="warn" title="Microphone is blocked">Open your browser's site settings for Ruko and allow the microphone. You can still answer by tapping.</Notice>}
        {(mic === "prompt" || mic === "unknown") && (
          <Button variant="secondary" className="w-full" icon={<Mic className="h-5 w-5" />} onClick={async () => setMic(await requestMicrophone())}>
            Allow microphone
          </Button>
        )}
      </Section>

      <Section id="contacts" icon={<Users />} title="Trusted contacts" sub="People Ruko alerts, in this order. Stored encrypted.">
        <ContactEditor
          compact
          contacts={household.contacts}
          onAdd={async (c) => setContacts((await api<{ contacts: PublicContact[] }>("/api/household/contacts", { body: c })).contacts)}
          onRemove={async (id) => setContacts((await api<{ contacts: PublicContact[] }>(`/api/household/contacts/${id}`, { method: "DELETE" })).contacts)}
          onMove={async (id, dir) => setContacts((await api<{ contacts: PublicContact[] }>(`/api/household/contacts/${id}`, { method: "PATCH", body: { move: dir } })).contacts)}
        />
      </Section>

      <Section id="alerts" icon={<BellRing />} title="Family alerts" sub="When Ruko should tell your trusted contacts.">
        <div className="space-y-2" role="radiogroup" aria-label="Alert consent">
          {(
            [
              ["ask", "Ask me each time (recommended)"],
              ["always", "Tell them automatically"],
              ["never", "Never send alerts"],
            ] as [AlertConsent, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              role="radio"
              aria-checked={household.alertConsent === v}
              disabled={offline || busy === "consent"}
              onClick={() => patch({ alertConsent: v }, "consent")}
              className={cx("flex min-h-[56px] w-full items-center gap-3 rounded-2xl border-2 px-4 text-left font-semibold", household.alertConsent === v ? "border-lavender-deep bg-lavender-soft" : "border-line bg-white")}
            >
              <span className={cx("h-5 w-5 shrink-0 rounded-full border-2", household.alertConsent === v ? "border-lavender-deep bg-lavender-deep shadow-[inset_0_0_0_3px_white]" : "border-navy-faint")} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        {saved === "consent" && <p className="mt-2 text-base font-semibold text-sage-deep">Saved</p>}
      </Section>

      <Section id="family" icon={<LayoutDashboard />} title="Connect family dashboard" sub={`${household.linkedFamilyCount} family dashboard${household.linkedFamilyCount === 1 ? "" : "s"} connected`}>
        <p className="text-base text-navy-soft">Your family member signs in at the Ruko family dashboard and enters this code. It works once, for 15 minutes.</p>
        {pairing ? (
          <div className="mt-4 rounded-2xl bg-lavender-mist p-5 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-lavender-deep">Your code</p>
            <p className="mt-1 text-4xl font-extrabold tracking-[0.3em] tabular-nums" aria-label={pairing.code.split("").join(" ")}>
              {pairing.code}
            </p>
            <p className="mt-1 text-base text-navy-soft">Valid until {new Date(pairing.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="mt-4 w-full"
            icon={<KeyRound className="h-5 w-5" />}
            loading={busy === "pair"}
            disabled={offline}
            onClick={async () => {
              setBusy("pair");
              try {
                setPairing(await api("/api/household/pairing", { method: "POST" }));
              } catch (e) {
                setError(e instanceof Error ? e.message : "Couldn't create a code.");
              } finally {
                setBusy(null);
              }
            }}
          >
            Get a connection code
          </Button>
        )}
        <Link href="/family" className="mt-3 flex min-h-[48px] items-center justify-between rounded-2xl px-1 font-semibold text-lavender-deep">
          Open the family dashboard <ChevronRight className="h-5 w-5" />
        </Link>
      </Section>

      <Section id="account" icon={<UserRound />} title="Account" sub="How Ruko greets you">
        <label className="label" htmlFor="nm">Your name</label>
        <div className="flex gap-3">
          <input id="nm" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <Button onClick={() => name.trim() && patch({ elderName: name.trim() }, "name")} loading={busy === "name"} disabled={offline || !name.trim()}>
            Save
          </Button>
        </div>
        {saved === "name" && <p className="mt-2 text-base font-semibold text-sage-deep">Saved</p>}
      </Section>

      <Section id="privacy" icon={<Shield />} title="Privacy & data" sub="You are in control.">
        <ul className="space-y-2 text-base text-navy-soft">
          <li>• Your words are checked on this phone and are not saved.</li>
          <li>• Ruko saves only the outcome of each help session (for example “possible scam”), so your family can see it.</li>
          <li>• Contact names and numbers are encrypted.</li>
          <li>• Ruko never asks for Aadhaar, OTP, PIN or bank details.</li>
        </ul>
        <Link href="/privacy" className="mt-3 flex min-h-[48px] items-center justify-between font-semibold text-lavender-deep">
          Read the privacy policy <ChevronRight className="h-5 w-5" />
        </Link>
        <Button variant="danger" className="mt-3 w-full" icon={<Trash2 className="h-5 w-5" />} onClick={() => setConfirmDelete(true)} disabled={offline}>
          Delete all my data
        </Button>
      </Section>

      <Modal open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete all your Ruko data?" description="This permanently removes your contacts, help history and alerts from Ruko, and disconnects family dashboards. It cannot be undone.">
        <div className="grid gap-3">
          <Button
            variant="coral"
            loading={busy === "delete"}
            onClick={async () => {
              setBusy("delete");
              try {
                await api("/api/household", { method: "DELETE" });
                signOutDevice();
                router.replace("/welcome");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Couldn't delete.");
                setBusy(null);
                setConfirmDelete(false);
              }
            }}
          >
            Yes, delete everything
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Keep my data
          </Button>
        </div>
      </Modal>
    </main>
  );
}

function Section({ id, icon, title, sub, children }: { id: string; icon: ReactNode; title: string; sub?: string; children: ReactNode }) {
  return (
    <Card className="mt-5 scroll-mt-6 p-5 sm:p-6">
      <div id={id} className="mb-4 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lavender-soft text-lavender-deep [&>svg]:h-5 [&>svg]:w-5" aria-hidden>
          {icon}
        </span>
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {sub && <p className="text-base text-navy-soft">{sub}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}
