import { requireUser } from "@/lib/server/auth";
import { processEscalations } from "@/lib/server/alerts";
import { decrypt } from "@/lib/server/crypto";
import { read } from "@/lib/server/db";
import { handle, ok } from "@/lib/server/http";
import { getNotificationProvider } from "@/lib/server/notify";
import { toAlert, toHousehold, toSession } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

/** Everything the family dashboard needs, scoped to households linked to this account. */
export const GET = handle(async () => {
  const user = await requireUser();
  const ids = await read((db) => db.households.filter((h) => h.linkedUserIds.includes(user.id)).map((h) => h.id));
  for (const id of ids) await processEscalations(id);
  const data = await read((db) => {
    const households = db.households.filter((h) => ids.includes(h.id));
    return {
      user: { id: user.id, name: decrypt(user.nameEnc), email: decrypt(user.emailEnc), prefs: user.prefs, isDemo: Boolean(user.isDemo) },
      households: households.map((h) => {
        const last = db.sessions.find((s) => s.householdId === h.id);
        return { ...toHousehold(db, h), lastSessionAt: last?.endedAt ?? null };
      }),
      alerts: db.alerts.filter((a) => ids.includes(a.householdId)).slice(0, 50).map((a) => toAlert(db, a)),
      sessions: db.sessions.filter((s) => ids.includes(s.householdId)).slice(0, 50).map(toSession),
      outbox: getNotificationProvider().isLive ? [] : db.outbox
            .filter((o) => ids.includes(o.householdId))
            .slice(0, 20)
            .map((o) => ({ id: o.id, alertId: o.alertId, toMasked: o.toMasked, createdAt: o.createdAt, body: o.bodyEnc ? decrypt(o.bodyEnc) : (o.body ?? "") })),
      notifications: { provider: getNotificationProvider().name, live: getNotificationProvider().isLive },
    };
  });
  return ok(data);
});
