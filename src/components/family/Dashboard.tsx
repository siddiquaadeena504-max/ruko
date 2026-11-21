"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BellRing,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Home,
  Inbox,
  KeyRound,
  LogOut,
  Phone,
  Settings2,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { languageInfo } from "@/lib/i18n/languages";
import type { PublicAlert, PublicContact, PublicHousehold, PublicSession } from "@/lib/types";
import { ContactEditor } from "@/components/ContactEditor";
import { Logo } from "@/components/Logo";
import { Button, Card, EmptyState, Notice, Pill, Toggle, cx } from "@/components/ui";
import { DELIVERY_LABEL, INDICATOR_LABELS, LEVEL_LABEL, STATUS_LABEL, fullDate, timeAgo } from "./labels";

export interface DashboardData {
  user: { id: string; name: string; email: string; prefs: { alertsInDashboard: boolean; escalationReminders: boolean }; isDemo: boolean };
  households: (PublicHousehold & { lastSessionAt: string | null })[];
  alerts: PublicAlert[];
  sessions: PublicSession[];
  outbox: { id: string; alertId: string; toMasked: string; body: string; createdAt: string }[];
  notifications: { provider: string; live: boolean };
}

type Tab = "overview" | "alerts" | "history" | "contacts" | "settings" | "learn";
const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: "overview", label: "Overview", Icon: Home },
  { id: "alerts", label: "Alerts", Icon: BellRing },
  { id: "history", label: "History", Icon: History },
  { id: "contacts", label: "Contacts", Icon: Users },
  { id: "settings", label: "Preferences", Icon: Settings2 },
  { id: "learn", label: "Learn", Icon: BookOpen },
];

export function Dashboard({ data, reload, onSignOut, connectionError }: { data: DashboardData; reload: () => Promise<void>; onSignOut: () => void; connectionError: string | null }) {
  const [tab, setTab] = useState<Tab>("overview");
  const pending = data.alerts.filter((a) => a.status === "pending" || a.status === "exhausted");
  useBrowserNotifications(data);

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <Logo size={34} />
            <span className="hidden text-base font-medium text-navy-soft sm:inline">Family dashboard</span>
            {data.user.isDemo && <Pill tone="lavender">Sample data</Pill>}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-base font-semibold sm:inline">{data.user.name}</span>
            <Button variant="ghost" size="md" icon={<LogOut className="h-4 w-4" />} onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2" aria-label="Dashboard sections">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cx(
                "inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-3.5 text-base font-semibold transition",
                tab === id ? "bg-white text-navy shadow-card" : "text-navy-soft hover:bg-navy/5",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
              {id === "alerts" && pending.length > 0 && <span className="rounded-full bg-coral-dark px-2 text-xs text-white">{pending.length}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-5 pb-16 pt-6">
        {connectionError && <Notice className="mb-4" tone="warn">{connectionError}</Notice>}
        {!data.notifications.live && (
          <Notice className="mb-5" tone="info" title="Demo notification mode">
            SMS isn’t connected on this server, so alerts appear here and in the demo outbox but <strong>no text message is actually sent</strong>. Configure Twilio to send real alerts.
          </Notice>
        )}
        <div key={tab} className="animate-rise">
          {tab === "overview" && <Overview data={data} reload={reload} goAlerts={() => setTab("alerts")} />}
          {tab === "alerts" && <AlertsTab data={data} reload={reload} />}
          {tab === "history" && <HistoryTab data={data} />}
          {tab === "contacts" && <ContactsTab data={data} reload={reload} />}
          {tab === "settings" && <PreferencesTab data={data} reload={reload} />}
          {tab === "learn" && <LearnTab />}
        </div>
      </main>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function Overview({ data, reload, goAlerts }: { data: DashboardData; reload: () => Promise<void>; goAlerts: () => void }) {
  const active = data.alerts.filter((a) => a.status === "pending" || a.status === "exhausted");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hello, {data.user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-lg text-navy-soft">
          {active.length ? `${active.length} alert${active.length > 1 ? "s" : ""} need${active.length > 1 ? "" : "s"} your attention.` : "No alerts need your attention right now."}
        </p>
      </div>

      {data.user.prefs.alertsInDashboard &&
        active.map((a) => (
          <div key={a.id} className="rounded-card border-2 border-coral/60 bg-coral-soft p-5 shadow-card" role="alert">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-3">
                <ShieldAlert className="mt-1 h-7 w-7 shrink-0 text-coral-dark" aria-hidden />
                <div>
                  <p className="text-xl font-bold">{a.elderName} may be on a scam call</p>
                  <p className="text-base text-navy-soft">
                    {LEVEL_LABEL[a.level].label} · {timeAgo(a.createdAt)}
                  </p>
                  <p className="mt-2 text-base">Call them now on a number you already know. Don’t call back any number the caller gave.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <AckButton alert={a} reload={reload} />
                <Button variant="secondary" size="md" onClick={goAlerts}>
                  Details
                </Button>
              </div>
            </div>
          </div>
        ))}

      <section>
        <h2 className="mb-3 text-xl font-bold">Connected family members</h2>
        {data.households.length === 0 ? (
          <Card className="p-2">
            <EmptyState icon={<UserRound className="h-6 w-6" />} title="No one connected yet">
              On your parent’s phone, open Ruko → Settings → “Connect family dashboard” and enter the 6-digit code below.
            </EmptyState>
            <div className="mx-auto max-w-sm pb-6">
              <LinkForm reload={reload} />
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.households.map((h) => {
              const last = data.alerts.find((a) => a.householdId === h.id);
              return (
                <Card key={h.id} className="p-5">
                  <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lavender-soft text-xl font-bold text-lavender-deep">{h.elderName.charAt(0)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xl font-bold">{h.elderName}</p>
                      <p className="text-base text-navy-soft">
                        {languageInfo(h.language).english} · {h.contacts.length} trusted contact{h.contacts.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-base">
                    <div className="rounded-2xl bg-ivory p-3">
                      <dt className="text-sm text-navy-soft">Last help session</dt>
                      <dd className="font-semibold">{h.lastSessionAt ? timeAgo(h.lastSessionAt) : "None yet"}</dd>
                    </div>
                    <div className="rounded-2xl bg-ivory p-3">
                      <dt className="text-sm text-navy-soft">Alert consent</dt>
                      <dd className="font-semibold">{{ ask: "Asks each time", always: "Automatic", never: "Alerts off" }[h.alertConsent]}</dd>
                    </div>
                    <div className="col-span-2 rounded-2xl bg-ivory p-3">
                      <dt className="text-sm text-navy-soft">Latest alert</dt>
                      <dd className="font-semibold">{last ? `${STATUS_LABEL[last.status].label} · ${timeAgo(last.createdAt)}` : "No alerts"}</dd>
                    </div>
                  </dl>
                  {h.contacts.length === 0 && <Notice className="mt-3" tone="warn">No trusted contacts — Ruko can’t alert anyone. Add one in Contacts.</Notice>}
                </Card>
              );
            })}
            <Card className="flex flex-col justify-center p-5">
              <p className="font-semibold">Connect another family member</p>
              <p className="mb-3 text-base text-navy-soft">Enter the 6-digit code from their Ruko settings.</p>
              <LinkForm reload={reload} />
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}

function LinkForm({ reload }: { reload: () => Promise<void> }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          await api("/api/family/link", { body: { code } });
          setCode("");
          setMsg({ tone: "ok", text: "Connected!" });
          await reload();
        } catch (err) {
          setMsg({ tone: "warn", text: err instanceof Error ? err.message : "Couldn't connect" });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex gap-2">
        <label htmlFor="pair-code" className="sr-only">6-digit code</label>
        <input
          id="pair-code"
          className="field text-center text-xl font-bold tracking-[0.3em] tabular-nums"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
        />
        <Button type="submit" loading={busy} disabled={code.length !== 6} icon={<KeyRound className="h-4 w-4" />}>
          Connect
        </Button>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </form>
  );
}

/* ---------------- Alerts ---------------- */

function AckButton({ alert, reload }: { alert: PublicAlert; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (alert.status === "acknowledged" || alert.status === "not_sent") return null;
  return (
    <Button
      size="md"
      icon={<CheckCircle2 className="h-4 w-4" />}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/api/alerts/${alert.id}/ack`, { method: "POST" });
          await reload();
        } finally {
          setBusy(false);
        }
      }}
    >
      I’m on it
    </Button>
  );
}

function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.round((new Date(to).getTime() - now) / 1000));
  return <span className="tabular-nums">{s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "now"}</span>;
}

function AlertsTab({ data, reload }: { data: DashboardData; reload: () => Promise<void> }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Alerts</h1>
      {data.alerts.length === 0 ? (
        <Card>
          <EmptyState icon={<BellRing className="h-6 w-6" />} title="No alerts yet">
            When Ruko finds a scam pattern and your family member agrees, the alert appears here.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.alerts.map((a) => (
            <Card key={a.id} as="article" className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{a.elderName}</p>
                  <p className="text-base text-navy-soft">{fullDate(a.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={LEVEL_LABEL[a.level].tone}>{LEVEL_LABEL[a.level].label}</Pill>
                  <Pill tone={STATUS_LABEL[a.status].tone}>{STATUS_LABEL[a.status].label}</Pill>
                </div>
              </div>
              {a.indicatorIds.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.indicatorIds.map((id) => (
                    <span key={id} className="rounded-full bg-ivory px-3 py-1 text-sm font-medium text-navy-soft">
                      {INDICATOR_LABELS[id] ?? id}
                    </span>
                  ))}
                </div>
              )}
              <ol className="mt-4 space-y-2 border-l-2 border-line pl-4">
                {a.deliveries.map((d, i) => (
                  <li key={i} className="relative text-base">
                    <span
                      className={cx("absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white", d.status === "failed" ? "bg-coral-dark" : d.status === "sent" ? "bg-sage-dark" : "bg-lavender")}
                      aria-hidden
                    />
                    <span className="font-semibold">{i === 0 ? "Alerted" : "Escalated to"} {d.contactName}</span> <span className="tabular-nums text-navy-soft">{d.phoneMasked}</span>
                    <span className="block text-sm text-navy-soft">
                      {DELIVERY_LABEL[d.status]} · {fullDate(d.attemptedAt)}
                      {d.error ? ` · ${d.error}` : ""}
                    </span>
                  </li>
                ))}
                {a.status === "acknowledged" && (
                  <li className="relative text-base">
                    <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-sage-dark" aria-hidden />
                    <span className="font-semibold text-sage-deep">Acknowledged by {a.acknowledgedBy}</span>
                    {a.acknowledgedAt && <span className="block text-sm text-navy-soft">{fullDate(a.acknowledgedAt)}</span>}
                  </li>
                )}
                {a.deliveries.length === 0 && <li className="text-base text-navy-soft">No trusted contacts were configured, so nobody could be alerted.</li>}
              </ol>
              {a.status === "pending" && a.nextEscalationAt && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-lavender-mist px-3 py-2 text-base">
                  <Clock className="h-4 w-4 text-lavender-deep" aria-hidden /> Escalates to the next contact in <Countdown to={a.nextEscalationAt} />
                </p>
              )}
              {a.status === "exhausted" && <Notice className="mt-3" tone="warn">Every contact was tried and nobody acknowledged. Please call {a.elderName} now.</Notice>}
              <div className="mt-4">
                <AckButton alert={a} reload={reload} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {data.outbox.length > 0 && (
        <section>
          <h2 className="mb-1 text-xl font-bold">Demo outbox</h2>
          <p className="mb-3 text-base text-navy-soft">These are the messages Ruko would have sent. They were <strong>not</strong> delivered to any phone.</p>
          <div className="space-y-3">
            {data.outbox.map((o) => (
              <Card key={o.id} className="p-4">
                <p className="flex items-center gap-2 text-sm text-navy-soft">
                  <Inbox className="h-4 w-4" aria-hidden /> To {o.toMasked} · {fullDate(o.createdAt)}
                </p>
                <p className="mt-2 text-base">{o.body}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------------- History ---------------- */

function HistoryTab({ data }: { data: DashboardData }) {
  const names = Object.fromEntries(data.households.map((h) => [h.id, h.elderName]));
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Help session history</h1>
      <p className="text-lg text-navy-soft">Only outcomes are kept — never what was said.</p>
      {data.sessions.length === 0 ? (
        <Card>
          <EmptyState icon={<History className="h-6 w-6" />} title="No help sessions yet" />
        </Card>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {data.sessions.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">
                  {names[s.householdId]} · <span className="font-normal text-navy-soft">{fullDate(s.startedAt)}</span>
                </p>
                <p className="text-sm text-navy-soft">
                  {s.indicatorIds.length ? s.indicatorIds.map((id) => INDICATOR_LABELS[id] ?? id).join(" · ") : "No warning signs identified"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill tone={LEVEL_LABEL[s.level].tone}>{LEVEL_LABEL[s.level].label}</Pill>
                <Pill>{s.alertId ? "Family alerted" : "No alert sent"}</Pill>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/* ---------------- Contacts ---------------- */

function ContactsTab({ data, reload }: { data: DashboardData; reload: () => Promise<void> }) {
  if (data.households.length === 0)
    return (
      <Card>
        <EmptyState icon={<Users className="h-6 w-6" />} title="Connect a family member first">
          Trusted contacts belong to a family member’s Ruko. Connect one from the Overview tab.
        </EmptyState>
      </Card>
    );
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Trusted contacts</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        {data.households.map((h) => (
          <Card key={h.id} className="p-5">
            <h2 className="mb-1 text-xl font-bold">{h.elderName}’s contacts</h2>
            <p className="mb-4 text-base text-navy-soft">Alerted in this order. Up to 5.</p>
            <HouseholdContacts household={h} reload={reload} />
          </Card>
        ))}
      </div>
    </div>
  );
}

function HouseholdContacts({ household, reload }: { household: PublicHousehold; reload: () => Promise<void> }) {
  const [contacts, setContacts] = useState<PublicContact[]>(household.contacts);
  useEffect(() => setContacts(household.contacts), [household.contacts]);
  const after = async (p: Promise<{ contacts: PublicContact[] }>) => {
    setContacts((await p).contacts);
    void reload();
  };
  return (
    <ContactEditor
      compact
      contacts={contacts}
      onAdd={(c) => after(api("/api/family/contacts", { body: { ...c, householdId: household.id } }))}
      onRemove={(id) => after(api(`/api/family/contacts/${id}`, { method: "DELETE", body: { householdId: household.id } }))}
      onMove={(id, dir) => after(api(`/api/family/contacts/${id}`, { method: "PATCH", body: { householdId: household.id, move: dir } }))}
    />
  );
}

/* ---------------- Preferences ---------------- */

function PreferencesTab({ data, reload }: { data: DashboardData; reload: () => Promise<void> }) {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission), []);
  const save = async (body: Record<string, unknown>) => {
    await api("/api/family/preferences", { method: "PATCH", body });
    await reload();
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Preferences</h1>
      <Card className="p-5">
        <h2 className="text-xl font-bold">Notifications</h2>
        <Toggle checked={data.user.prefs.alertsInDashboard} onChange={(v) => save({ alertsInDashboard: v })} label="Show alert banners" description="Highlight active alerts at the top of the overview" />
        <Toggle
          checked={data.user.prefs.escalationReminders}
          onChange={(v) => save({ escalationReminders: v })}
          label="Browser notifications"
          description="Notify me in this browser when a new alert arrives (while the dashboard is open)"
        />
        {data.user.prefs.escalationReminders && perm !== "granted" && (
          <div className="mt-2">
            {perm === "unsupported" ? (
              <Notice tone="info">This browser doesn’t support notifications.</Notice>
            ) : perm === "denied" ? (
              <Notice tone="warn">Notifications are blocked for this site in your browser settings.</Notice>
            ) : (
              <Button variant="secondary" size="md" onClick={async () => setPerm(await Notification.requestPermission())}>
                Allow browser notifications
              </Button>
            )}
          </div>
        )}
        <p className="mt-3 text-sm text-navy-soft">
          Text-message alerts go to the trusted contacts’ phone numbers. Provider: <strong>{data.notifications.live ? "SMS (live)" : "demo mode — not sent"}</strong>
        </p>
      </Card>

      {data.households.map((h) => (
        <Card key={h.id} className="p-5">
          <h2 className="text-xl font-bold">{h.elderName}</h2>
          <label className="label mt-3" htmlFor={`esc-${h.id}`}>
            If nobody responds, alert the next contact after
          </label>
          <select id={`esc-${h.id}`} className="field max-w-xs" value={h.escalateAfterSec} onChange={(e) => save({ householdId: h.id, escalateAfterSec: Number(e.target.value) })}>
            {[60, 120, 300, 600].map((s) => (
              <option key={s} value={s}>
                {s / 60} minute{s === 60 ? "" : "s"}
              </option>
            ))}
          </select>
          <p className="mt-3 text-base text-navy-soft">Alert consent is chosen by {h.elderName} on their phone and can only be changed there.</p>
          <Button
            variant="danger"
            size="md"
            className="mt-4"
            onClick={async () => {
              if (!confirm(`Disconnect ${h.elderName} from your dashboard? You will stop seeing their alerts.`)) return;
              await api("/api/family/link", { method: "DELETE", body: { householdId: h.id } });
              await reload();
            }}
          >
            Disconnect from my dashboard
          </Button>
        </Card>
      ))}

      <Card className="p-5">
        <h2 className="text-xl font-bold">Account</h2>
        <p className="mt-1 text-base text-navy-soft">
          {data.user.name} · {data.user.isDemo ? "temporary demo account" : data.user.email}
        </p>
      </Card>
    </div>
  );
}

/* ---------------- Learn ---------------- */

function LearnTab() {
  const signs = [
    "A call or video call from someone claiming to be CBI, police, customs, NCB, RBI, TRAI or a judge.",
    "A story about a parcel with drugs, a SIM card or Aadhaar being misused, or money laundering.",
    "Being told you are under “digital arrest” and must stay on camera.",
    "Being told not to speak to family, to stay in a room, or to keep it secret.",
    "Demands to move money to a “safe” or “verification” account, or to share OTPs.",
  ];
  const tips = [
    "Agree on a family rule: “No real officer ever asks for money on a call. If in doubt, hang up and call me.”",
    "Practise with the Ruko demo together, so the button feels familiar before it’s ever needed.",
    "Make sure your number is saved in their phone with a clear name and photo.",
    "If money was transferred, call 1930 within the first hour — the “golden hour” gives the best chance of freezing it.",
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Digital arrest scams</h1>
      <p className="max-w-3xl text-lg text-navy-soft">
        There is no such thing as a “digital arrest” in Indian law. Scammers impersonate officials, frighten people with fake cases, keep them on video calls for hours, and pressure them into transferring savings.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-bold">Warning signs</h2>
          <ul className="mt-3 space-y-2.5 text-base">
            {signs.map((s) => (
              <li key={s} className="flex gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-coral-dark" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold">How to prepare your family</h2>
          <ul className="mt-3 space-y-2.5 text-base">
            {tips.map((s) => (
              <li key={s} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sage-deep" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="p-6">
        <h2 className="text-xl font-bold">Official help</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Resource href="tel:1930" icon={<Phone className="h-5 w-5" />} title="1930" body="National Cyber Crime Helpline — report financial fraud" />
          <Resource href="https://cybercrime.gov.in" icon={<ExternalLink className="h-5 w-5" />} title="cybercrime.gov.in" body="National Cyber Crime Reporting Portal" />
          <Resource href="https://sancharsaathi.gov.in" icon={<ExternalLink className="h-5 w-5" />} title="Sanchar Saathi" body="Report suspected fraud calls and messages (Chakshu)" />
        </div>
      </Card>
    </div>
  );
}

function Resource({ href, icon, title, body }: { href: string; icon: ReactNode; title: string; body: string }) {
  const external = href.startsWith("http");
  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="rounded-2xl border-2 border-line p-4 transition hover:border-lavender/60 hover:bg-lavender-mist">
      <span className="flex items-center gap-2 font-bold text-lavender-deep">
        {icon}
        {title}
      </span>
      <span className="mt-1 block text-base text-navy-soft">{body}</span>
    </a>
  );
}

/* ---------------- Browser notifications for new alerts ---------------- */

function useBrowserNotifications(data: DashboardData) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const pendingIds = data.alerts.filter((a) => a.status === "pending").map((a) => a.id);
    if (seen.current === null) {
      seen.current = new Set(pendingIds); // don't notify for alerts already present on first load
      return;
    }
    const fresh = data.alerts.filter((a) => a.status === "pending" && !seen.current!.has(a.id));
    fresh.forEach((a) => seen.current!.add(a.id));
    if (!fresh.length || !data.user.prefs.escalationReminders) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    for (const a of fresh) {
      new Notification("Ruko alert", { body: `A possible digital arrest scam was detected during a help session with ${a.elderName}. Please call them on a trusted number.`, tag: a.id });
    }
  }, [data]);
}
