import { requireDevice } from "@/lib/server/auth";
import { addContact } from "@/lib/server/contacts";
import { read } from "@/lib/server/db";
import { handle, ok, readJson } from "@/lib/server/http";
import { householdContacts, toContact } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const hh = await requireDevice(req);
  return ok({ contacts: await read((db) => householdContacts(db, hh.id).map(toContact)) });
});

export const POST = handle(async (req: Request) => {
  const hh = await requireDevice(req);
  return ok({ contacts: await addContact(hh.id, await readJson(req)) }, { status: 201 });
});
