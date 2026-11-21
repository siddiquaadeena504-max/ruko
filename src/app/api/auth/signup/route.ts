import { startSession } from "@/lib/server/auth";
import { encrypt, hashPassword, lookupHash, randomId } from "@/lib/server/crypto";
import { write } from "@/lib/server/db";
import { clientKey, handle, HttpError, ok, rateLimit, readJson, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  rateLimit(`signup:${clientKey(req)}`, 10, 60_000);
  const body = await readJson(req);
  const name = str(body.name, "Name", { max: 60 });
  const email = str(body.email, "Email", { max: 120 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Please enter a valid email");
  const password = str(body.password, "Password", { min: 8, max: 200 });
  const emailHash = lookupHash(email);
  const passwordHash = hashPassword(password);
  const userId = await write((db) => {
    if (db.users.some((u) => u.emailHash === emailHash)) throw new HttpError(409, "An account with this email already exists");
    const id = randomId("usr");
    db.users.push({
      id,
      emailHash,
      emailEnc: encrypt(email),
      nameEnc: encrypt(name),
      passwordHash,
      prefs: { alertsInDashboard: true, escalationReminders: true },
      createdAt: new Date().toISOString(),
    });
    return id;
  });
  await startSession(userId);
  return ok({ ok: true }, { status: 201 });
});
