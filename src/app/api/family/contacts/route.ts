import { requireHouseholdAccess } from "@/lib/server/auth";
import { addContact } from "@/lib/server/contacts";
import { handle, ok, readJson, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** A linked family member adds a trusted contact for a household. */
export const POST = handle(async (req: Request) => {
  const body = await readJson(req);
  const householdId = str(body.householdId, "Household", { max: 60 });
  await requireHouseholdAccess(req, householdId);
  return ok({ contacts: await addContact(householdId, body) }, { status: 201 });
});
