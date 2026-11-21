import { currentUser } from "@/lib/server/auth";
import { decrypt } from "@/lib/server/crypto";
import { handle, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const u = await currentUser();
  if (!u) return ok({ user: null });
  return ok({ user: { id: u.id, name: decrypt(u.nameEnc), email: decrypt(u.emailEnc), prefs: u.prefs, isDemo: Boolean(u.isDemo) } });
});
