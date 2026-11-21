import { acknowledgeAlert } from "@/lib/server/alerts";
import { decrypt, hashToken, safeEqualHex } from "@/lib/server/crypto";
import { read } from "@/lib/server/db";
import { clientKey, handle, HttpError, ok, rateLimit, readJson, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Acknowledge via the secret link in the SMS: /ack/<alertId>.<token>. No account needed. */
export const POST = handle(async (req: Request) => {
  rateLimit(`ack:${clientKey(req)}`, 20, 60_000);
  const body = await readJson(req);
  const raw = str(body.token, "Link", { max: 120 });
  const dot = raw.indexOf(".");
  const alertId = raw.slice(0, dot);
  const secret = raw.slice(dot + 1);
  if (dot < 1 || !secret) throw new HttpError(400, "This link is not valid.");
  const found = read((db) => {
    const a = db.alerts.find((x) => x.id === alertId);
    if (!a || !safeEqualHex(a.ackTokenHash, hashToken(secret))) return null;
    const h = db.households.find((x) => x.id === a.householdId);
    return { elderName: h ? decrypt(h.elderNameEnc) : "your family member", status: a.status };
  });
  if (!found) throw new HttpError(404, "This link is not valid or has expired.");
  await acknowledgeAlert(alertId, "Family member (via alert link)");
  return ok({ acknowledged: true, elderName: found.elderName });
});
