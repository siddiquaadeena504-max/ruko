import { requireHouseholdAccess } from "@/lib/server/auth";
import { processEscalations } from "@/lib/server/alerts";
import { read } from "@/lib/server/db";
import { handle, HttpError, ok } from "@/lib/server/http";
import { toAlert } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Returns alert status. Reading also advances escalation if the current contact hasn't responded. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const householdId = read((db) => db.alerts.find((a) => a.id === id)?.householdId);
  if (!householdId) throw new HttpError(404, "Alert not found");
  await requireHouseholdAccess(req, householdId);
  await processEscalations(householdId);
  return ok({ alert: read((db) => toAlert(db, db.alerts.find((a) => a.id === id)!)) });
});
