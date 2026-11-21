import { requireDevice } from "@/lib/server/auth";
import { encrypt, hashToken, randomId, randomToken } from "@/lib/server/crypto";
import { read, write, type ContactRecord, type HouseholdRecord } from "@/lib/server/db";
import { handle, HttpError, normalisePhone, ok, readJson, str } from "@/lib/server/http";
import { toHousehold } from "@/lib/server/repo";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";
import type { AlertConsent, LanguageCode } from "@/lib/types";

export const dynamic = "force-dynamic";

const CONSENTS: AlertConsent[] = ["ask", "always", "never"];

function lang(v: unknown): LanguageCode {
  if (typeof v === "string" && (LANGUAGE_CODES as string[]).includes(v)) return v as LanguageCode;
  throw new HttpError(400, "Unsupported language");
}

/** Create a household for this device (end of onboarding). Returns the device token once. */
export const POST = handle(async (req: Request) => {
  const body = await readJson(req);
  const elderName = str(body.elderName, "Your name", { max: 60, optional: true }) || "Friend";
  const language = lang(body.language);
  const alertConsent = CONSENTS.includes(body.alertConsent as AlertConsent) ? (body.alertConsent as AlertConsent) : "ask";
  const rawContacts = (Array.isArray(body.contacts) ? body.contacts.slice(0, 5) : []) as Record<string, unknown>[];

  const token = randomToken();
  const householdId = randomId("hh");
  const contacts: ContactRecord[] = rawContacts.map((c, i) => ({
    id: randomId("ct"),
    householdId,
    nameEnc: encrypt(str(c?.name, "Contact name", { max: 60 })),
    phoneEnc: encrypt(normalisePhone(c?.phone)),
    relation: str(c?.relation, "Relation", { max: 40, optional: true }),
    priority: i + 1,
    createdAt: new Date().toISOString(),
  }));

  const household = await write((db) => {
    const h: HouseholdRecord = {
      id: householdId,
      deviceTokenHash: hashToken(token),
      elderNameEnc: encrypt(elderName),
      language,
      voice: { enabled: body.voiceEnabled !== false, rate: body.voiceRate === "normal" ? "normal" : "slow" },
      alertConsent,
      escalateAfterSec: 120,
      linkedUserIds: [],
      createdAt: new Date().toISOString(),
    };
    db.households.push(h);
    db.contacts.push(...contacts);
    return toHousehold(db, h);
  });
  return ok({ deviceToken: token, household }, { status: 201 });
});

export const GET = handle(async (req: Request) => {
  const hh = requireDevice(req);
  return ok({ household: read((db) => toHousehold(db, hh)) });
});

export const PATCH = handle(async (req: Request) => {
  const hh = requireDevice(req);
  const body = await readJson(req);
  const household = await write((db) => {
    const h = db.households.find((x) => x.id === hh.id)!;
    if (body.elderName !== undefined) h.elderNameEnc = encrypt(str(body.elderName, "Your name", { max: 60 }));
    if (body.language !== undefined) h.language = lang(body.language);
    if (body.alertConsent !== undefined) {
      if (!CONSENTS.includes(body.alertConsent as AlertConsent)) throw new HttpError(400, "Invalid consent value");
      h.alertConsent = body.alertConsent as AlertConsent;
    }
    if (body.voiceEnabled !== undefined) h.voice.enabled = Boolean(body.voiceEnabled);
    if (body.voiceRate !== undefined) h.voice.rate = body.voiceRate === "normal" ? "normal" : "slow";
    return toHousehold(db, h);
  });
  return ok({ household });
});

/** Permanently delete everything for this household: contacts, sessions, alerts, outbox. */
export const DELETE = handle(async (req: Request) => {
  const hh = requireDevice(req);
  await write((db) => {
    db.households = db.households.filter((h) => h.id !== hh.id);
    db.contacts = db.contacts.filter((c) => c.householdId !== hh.id);
    db.sessions = db.sessions.filter((s) => s.householdId !== hh.id);
    db.alerts = db.alerts.filter((a) => a.householdId !== hh.id);
    db.outbox = db.outbox.filter((o) => o.householdId !== hh.id);
  });
  return ok({ deleted: true });
});
