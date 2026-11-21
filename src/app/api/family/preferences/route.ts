import { requireUser } from "@/lib/server/auth";
import { write } from "@/lib/server/db";
import { handle, HttpError, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";
const ESCALATION_CHOICES = [60, 120, 300, 600];

/** Update this family member's preferences, and optionally a linked household's escalation delay. */
export const PATCH = handle(async (req: Request) => {
  const user = await requireUser();
  const body = await readJson(req);
  await write((db) => {
    const u = db.users.find((x) => x.id === user.id)!;
    if (typeof body.alertsInDashboard === "boolean") u.prefs.alertsInDashboard = body.alertsInDashboard;
    if (typeof body.escalationReminders === "boolean") u.prefs.escalationReminders = body.escalationReminders;
    if (body.householdId !== undefined) {
      const hh = db.households.find((h) => h.id === body.householdId && h.linkedUserIds.includes(user.id));
      if (!hh) throw new HttpError(404, "Household not found");
      if (!ESCALATION_CHOICES.includes(Number(body.escalateAfterSec))) throw new HttpError(400, "Invalid escalation delay");
      hh.escalateAfterSec = Number(body.escalateAfterSec);
    }
  });
  return ok({ ok: true });
});
