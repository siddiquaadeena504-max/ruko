import { startSession } from "@/lib/server/auth";
import { lookupHash, verifyPassword } from "@/lib/server/crypto";
import { read } from "@/lib/server/db";
import { clientKey, handle, HttpError, ok, rateLimit, readJson, str } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  rateLimit(`login:${clientKey(req)}`, 10, 60_000);
  const body = await readJson(req);
  const email = str(body.email, "Email", { max: 120 });
  const password = str(body.password, "Password", { max: 200 });
  const user = await read((db) => db.users.find((u) => u.emailHash === lookupHash(email)));
  if (!user || !verifyPassword(password, user.passwordHash)) throw new HttpError(401, "Email or password is incorrect");
  await startSession(user.id);
  return ok({ ok: true });
});
