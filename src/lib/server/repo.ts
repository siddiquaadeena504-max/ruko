import "server-only";
import { decrypt } from "./crypto";
import type { AlertRecord, ContactRecord, DBShape, HouseholdRecord, SessionRecord } from "./db";
import type { PublicAlert, PublicContact, PublicHousehold, PublicSession } from "@/lib/types";
import { getNotificationProvider } from "./notify";

export function toContact(c: ContactRecord): PublicContact {
  return { id: c.id, name: decrypt(c.nameEnc), phone: decrypt(c.phoneEnc), relation: c.relation, priority: c.priority };
}

export function householdContacts(db: DBShape, householdId: string): ContactRecord[] {
  return db.contacts.filter((c) => c.householdId === householdId).sort((a, b) => a.priority - b.priority);
}

export function toHousehold(db: DBShape, h: HouseholdRecord): PublicHousehold {
  return {
    id: h.id,
    elderName: decrypt(h.elderNameEnc),
    language: h.language,
    voice: h.voice,
    alertConsent: h.alertConsent,
    escalateAfterSec: h.escalateAfterSec,
    contacts: householdContacts(db, h.id).map(toContact),
    linkedFamilyCount: h.linkedUserIds.length,
    createdAt: h.createdAt,
  };
}

export function toAlert(db: DBShape, a: AlertRecord): PublicAlert {
  const h = db.households.find((x) => x.id === a.householdId);
  const last = a.deliveries[a.deliveries.length - 1];
  const contacts = householdContacts(db, a.householdId);
  const hasMore = contacts.length > a.deliveries.length;
  return {
    id: a.id,
    householdId: a.householdId,
    elderName: h ? decrypt(h.elderNameEnc) : "Family member",
    createdAt: a.createdAt,
    level: a.level,
    indicatorIds: a.indicatorIds,
    status: a.status,
    acknowledgedAt: a.acknowledgedAt,
    acknowledgedBy: a.acknowledgedBy,
    escalateAfterSec: a.escalateAfterSec,
    nextEscalationAt:
      a.status === "pending" && last && hasMore
        ? new Date(new Date(last.attemptedAt).getTime() + a.escalateAfterSec * 1000).toISOString()
        : undefined,
    deliveries: a.deliveries.map((d) => ({
      contactId: d.contactId,
      contactName: decrypt(d.contactNameEnc),
      phoneMasked: d.phoneMasked,
      attemptedAt: d.attemptedAt,
      status: d.status,
      provider: d.provider,
      error: d.error,
    })),
    providerLive: getNotificationProvider().isLive,
  };
}

export function toSession(s: SessionRecord): PublicSession {
  return { ...s };
}
