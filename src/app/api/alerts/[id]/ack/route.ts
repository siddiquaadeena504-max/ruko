import { requireUser } from "@/lib/server/auth";
import { acknowledgeAlert } from "@/lib/server/alerts";
import { decrypt } from "@/lib/server/crypto";
import { read } from "@/lib/server/db";
import { handle, HttpError, ok } from "@/lib/server/http";
import { toAlert } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** A signed-in family member acknowledges an alert from the dashboard. */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const allowed = read((db) => {
    const a = db.alerts.find((x) => x.id === id);
    const h = a && db.households.find((x) => x.id === a.householdId);
    return Boolean(h?.linkedUserIds.includes(user.id));
  });
  if (!allowed) throw new HttpError(404, "Alert not found");
  await acknowledgeAlert(id, decrypt(user.nameEnc));
  return ok({ alert: read((db) => toAlert(db, db.alerts.find((a) => a.id === id)!)) });
});
