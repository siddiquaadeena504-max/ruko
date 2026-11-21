import { startSession } from "@/lib/server/auth";
import { encrypt, hashPassword, hashToken, lookupHash, randomId, randomToken } from "@/lib/server/crypto";
import { write, type AlertRecord } from "@/lib/server/db";
import { clientKey, handle, maskPhone, ok, rateLimit } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Creates a throwaway demo family account with a sample linked household, contacts,
 * past help sessions and alerts, so the dashboard can be explored without setup.
 * All demo phone numbers are fictional and no message is sent.
 */
export const POST = handle(async (req: Request) => {
  rateLimit(`demo:${clientKey(req)}`, 10, 60_000);
  const userId = randomId("usr");
  const hhId = randomId("hh");
  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  const contacts = [
    { id: randomId("ct"), name: "Priya Raman", phone: "+919800000001", relation: "Daughter" },
    { id: randomId("ct"), name: "Arjun Raman", phone: "+919800000002", relation: "Son" },
    { id: randomId("ct"), name: "Dr. Meena Iyer", phone: "+919800000003", relation: "Neighbour" },
  ];

  await write((db) => {
    db.users.push({
      id: userId,
      emailHash: lookupHash(`demo-${userId}@ruko.demo`),
      emailEnc: encrypt(`demo-${userId}@ruko.demo`),
      nameEnc: encrypt("Priya Raman"),
      passwordHash: hashPassword(randomToken()),
      prefs: { alertsInDashboard: true, escalationReminders: true },
      createdAt: new Date().toISOString(),
      isDemo: true,
    });
    db.households.push({
      id: hhId,
      deviceTokenHash: hashToken(randomToken()),
      elderNameEnc: encrypt("Lakshmi Amma"),
      language: "ta",
      voice: { enabled: true, rate: "slow" },
      alertConsent: "ask",
      escalateAfterSec: 120,
      linkedUserIds: [userId],
      createdAt: iso(20 * 86400_000),
      isDemo: true,
    });
    contacts.forEach((c, i) =>
      db.contacts.push({
        id: c.id,
        householdId: hhId,
        nameEnc: encrypt(c.name),
        phoneEnc: encrypt(c.phone),
        relation: c.relation,
        priority: i + 1,
        createdAt: iso(20 * 86400_000),
      }),
    );

    const mkDelivery = (i: number, msAgo: number) => ({
      contactId: contacts[i].id,
      contactNameEnc: encrypt(contacts[i].name),
      phoneMasked: maskPhone(contacts[i].phone),
      attemptedAt: iso(msAgo),
      status: "simulated" as const,
      provider: "demo-mock",
    });

    const sessions = [
      { ago: 3 * 60_000, level: "high" as const, ids: ["impersonation", "digital_arrest", "aadhaar_parcel", "money_demand", "video_call", "secrecy"] },
      { ago: 2 * 86400_000, level: "possible" as const, ids: ["money_demand", "urgency"] },
      { ago: 6 * 86400_000, level: "unclear" as const, ids: [] as string[] },
      { ago: 11 * 86400_000, level: "high" as const, ids: ["impersonation", "credentials", "urgency"] },
    ];
    const alerts: AlertRecord[] = [];
    for (const s of sessions) {
      const sid = randomId("ses");
      let alertId: string | undefined;
      if (s.level !== "unclear") {
        alertId = randomId("alr");
        const recent = s.ago < 3600_000;
        alerts.push({
          id: alertId,
          householdId: hhId,
          sessionId: sid,
          createdAt: iso(s.ago),
          level: s.level,
          indicatorIds: s.ids,
          status: recent ? "pending" : "acknowledged",
          acknowledgedAt: recent ? undefined : iso(s.ago - 4 * 60_000),
          acknowledgedBy: recent ? undefined : s.ago > 10 * 86400_000 ? "Arjun Raman" : "Priya Raman",
          escalateAfterSec: 120,
          ackTokenHash: hashToken(randomToken()),
          deliveries: recent ? [mkDelivery(0, s.ago)] : s.ago > 10 * 86400_000 ? [mkDelivery(0, s.ago), mkDelivery(1, s.ago - 120_000)] : [mkDelivery(0, s.ago)],
        });
      }
      db.sessions.push({ id: sid, householdId: hhId, startedAt: iso(s.ago + 180_000), endedAt: iso(s.ago), language: "ta", level: s.level, indicatorIds: s.ids, alertId });
    }
    db.alerts.push(...alerts);
    db.outbox.unshift({
      id: randomId("out"),
      alertId: alerts[0].id,
      householdId: hhId,
      toMasked: maskPhone(contacts[0].phone),
      bodyEnc: encrypt("Ruko Alert: A possible digital arrest scam was detected during a help session with Lakshmi Amma. Please contact them using a trusted number you already know."),
      createdAt: iso(3 * 60_000),
    });
  });
  await startSession(userId);
  return ok({ ok: true }, { status: 201 });
});
