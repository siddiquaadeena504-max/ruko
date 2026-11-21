import { endSession } from "@/lib/server/auth";
import { handle, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const POST = handle(async () => {
  await endSession();
  return ok({ ok: true });
});
