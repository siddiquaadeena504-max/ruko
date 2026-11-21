import { requireDevice } from "@/lib/server/auth";
import { hashToken, randomDigits } from "@/lib/server/crypto";
import { write } from "@/lib/server/db";
import { handle, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Generates a 6-digit code (valid 15 minutes) a family member enters to link their dashboard. */
export const POST = handle(async (req: Request) => {
  const hh = await requireDevice(req);
  const code = randomDigits(6);
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  await write((db) => {
    const h = db.households.find((x) => x.id === hh.id)!;
    h.pairing = { codeHash: hashToken(code), expiresAt };
  });
  return ok({ code, expiresAt });
});
