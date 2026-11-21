import "server-only";
import { decrypt, encrypt, randomId } from "./crypto";
import { read, write, type AlertRecord, type DBShape } from "./db";
import { maskPhone } from "./http";
import { getNotificationProvider } from "./notify";
import { householdContacts } from "./repo";
import type { RiskLevel } from "@/lib/types";

function publicUrl() {
  return (process.env.RUKO_PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "");
}

function buildMessage(elderName: string, ackLink: string) {
  // Deliberately contains no transcript, amounts or banking details.
  return (
    `Ruko Alert: A possible digital arrest scam was detected during a help session with ${elderName}. ` +
    `Please contact them using a trusted number you already know. Tap to acknowledge: ${ackLink}`
  );
}

/**
 * Sends the alert to the next contact in priority order that hasn't been tried yet.
 * If sending fails, it immediately moves on to the following contact.
 * Mutates `alert` inside a write transaction.
 */
async function sendToNext(db: DBShape, alert: AlertRecord, ackToken: string | null) {
  const provider = getNotificationProvider();
  const household = db.households.find((h) => h.id === alert.householdId);
  if (!household) return;
  const elderName = decrypt(household.elderNameEnc);
  const tried = new Set(alert.deliveries.map((d) => d.contactId));
  const queue = householdContacts(db, alert.householdId).filter((c) => !tried.has(c.id));

  for (const contact of queue) {
    const phone = decrypt(contact.phoneEnc);
    // The ack token is only known at creation time; escalations link to the dashboard instead.
    const link = ackToken ? `${publicUrl()}/ack/${alert.id}.${ackToken}` : `${publicUrl()}/family`;
    const body = buildMessage(elderName, link);
    const result = await provider.send(phone, body);
    alert.deliveries.push({
      contactId: contact.id,
      contactNameEnc: contact.nameEnc,
      phoneMasked: maskPhone(phone),
      attemptedAt: new Date().toISOString(),
      status: result.status,
      provider: provider.name,
      error: result.error,
    });
    if (!provider.isLive) {
      db.outbox.unshift({
        id: randomId("out"),
        alertId: alert.id,
        householdId: alert.householdId,
        toMasked: maskPhone(phone),
        bodyEnc: encrypt(body),
        createdAt: new Date().toISOString(),
      });
      db.outbox = db.outbox.slice(0, 100);
    }
    if (result.status !== "failed") return; // wait for acknowledgement before escalating
  }
  // Nobody left to try.
  if (alert.status === "pending") alert.status = alert.deliveries.some((d) => d.status !== "failed") ? "exhausted" : "not_sent";
}

export async function createAlert(opts: {
  householdId: string;
  sessionId?: string;
  level: RiskLevel;
  indicatorIds: string[];
  ackToken: string;
  ackTokenHash: string;
}): Promise<string> {
  return write(async (db) => {
    const household = db.households.find((h) => h.id === opts.householdId)!;
    const alert: AlertRecord = {
      id: randomId("alr"),
      householdId: opts.householdId,
      sessionId: opts.sessionId,
      createdAt: new Date().toISOString(),
      level: opts.level,
      indicatorIds: opts.indicatorIds,
      status: "pending",
      escalateAfterSec: household.escalateAfterSec,
      ackTokenHash: opts.ackTokenHash,
      deliveries: [],
    };
    db.alerts.unshift(alert);
    if (householdContacts(db, household.id).length === 0) {
      alert.status = "not_sent";
    } else {
      await sendToNext(db, alert, opts.ackToken);
    }
    if (opts.sessionId) {
      const s = db.sessions.find((x) => x.id === opts.sessionId);
      if (s) s.alertId = alert.id;
    }
    return alert.id;
  });
}

/** Lazy escalation: called whenever an alert is read. No background worker required. */
export async function processEscalations(householdId: string) {
  const now = Date.now();
  const due = (a: AlertRecord) => {
    if (a.status !== "pending") return false;
    const last = a.deliveries[a.deliveries.length - 1];
    return !last || now - new Date(last.attemptedAt).getTime() >= a.escalateAfterSec * 1000;
  };
  const needed = await read((db) => db.alerts.some((a) => a.householdId === householdId && due(a)));
  if (!needed) return;
  await write(async (db) => {
    for (const a of db.alerts) {
      if (a.householdId === householdId && due(a)) await sendToNext(db, a, null);
    }
  });
}

export async function acknowledgeAlert(alertId: string, by: string) {
  return write((db) => {
    const a = db.alerts.find((x) => x.id === alertId);
    if (!a) return false;
    if (a.status !== "acknowledged") {
      a.status = "acknowledged";
      a.acknowledgedAt = new Date().toISOString();
      a.acknowledgedBy = by;
    }
    return true;
  });
}
