import { requireHouseholdAccess } from "@/lib/server/auth";
import { removeContact, updateContact } from "@/lib/server/contacts";
import { handle, ok, readJson, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const householdId = str(body.householdId, "Household", { max: 60 });
  await requireHouseholdAccess(req, householdId);
  return ok({ contacts: await updateContact(householdId, id, body) });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const householdId = str(body.householdId, "Household", { max: 60 });
  await requireHouseholdAccess(req, householdId);
  return ok({ contacts: await removeContact(householdId, id) });
});
