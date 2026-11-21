import { requireDevice } from "@/lib/server/auth";
import { removeContact, updateContact } from "@/lib/server/contacts";
import { handle, ok, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const hh = await requireDevice(req);
  const { id } = await ctx.params;
  return ok({ contacts: await updateContact(hh.id, id, await readJson(req)) });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const hh = await requireDevice(req);
  const { id } = await ctx.params;
  return ok({ contacts: await removeContact(hh.id, id) });
});
