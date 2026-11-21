import { requireUser } from "@/lib/server/auth";
import { hashToken, safeEqualHex } from "@/lib/server/crypto";
import { write } from "@/lib/server/db";
import { clientKey, handle, HttpError, ok, rateLimit, readJson, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Link a household using the 6-digit code shown in the elder's Ruko settings. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`link:${user.id}:${clientKey(req)}`, 8, 60_000);
  const body = await readJson(req);
  const code = str(body.code, "Code", { max: 12 }).replace(/\D/g, "");
  if (code.length !== 6) throw new HttpError(400, "The code has 6 digits");
  const h = hashToken(code);
  const linked = await write((db) => {
    const hh = db.households.find((x) => x.pairing && new Date(x.pairing.expiresAt) > new Date() && safeEqualHex(x.pairing.codeHash, h));
    if (!hh) return false;
    if (!hh.linkedUserIds.includes(user.id)) hh.linkedUserIds.push(user.id);
    hh.pairing = undefined; // one-time use
    return true;
  });
  if (!linked) throw new HttpError(404, "That code didn't work. Codes expire after 15 minutes — ask for a new one.");
  return ok({ linked: true });
});

/** Unlink a household from this account. */
export const DELETE = handle(async (req: Request) => {
  const user = await requireUser();
  const body = await readJson(req);
  const householdId = str(body.householdId, "Household", { max: 60 });
  await write((db) => {
    const hh = db.households.find((x) => x.id === householdId);
    if (hh) hh.linkedUserIds = hh.linkedUserIds.filter((id) => id !== user.id);
  });
  return ok({ unlinked: true });
});
