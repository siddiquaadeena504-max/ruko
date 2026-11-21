import { ok } from "@/lib/server/http";
import { getNotificationProvider } from "@/lib/server/notify";

export const dynamic = "force-dynamic";

export async function GET() {
  const p = getNotificationProvider();
  return ok({ notifications: { provider: p.name, live: p.isLive } });
}
