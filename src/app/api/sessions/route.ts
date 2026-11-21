import { requireDevice } from "@/lib/server/auth";
import { createAlert } from "@/lib/server/alerts";
import { hashToken, randomId, randomToken } from "@/lib/server/crypto";
import { read, write } from "@/lib/server/db";
import { handle, HttpError, ok, readJson } from "@/lib/server/http";
import { toAlert, toSession } from "@/lib/server/repo";
import { INDICATOR_IDS } from "@/lib/scam/indicators";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";
import type { LanguageCode, RiskLevel } from "@/lib/types";

export const dynamic = "force-dynamic";
const LEVELS: RiskLevel[] = ["high", "possible", "unclear"];

/**
 * Records a finished help session. Only the outcome is stored (level + indicator ids) —
 * never the transcript, and never anything the person said about money or accounts.
 * If `sendAlert` is true (the person consented), alerts trusted contacts.
 */
export const POST = handle(async (req: Request) => {
  const hh = requireDevice(req);
  const body = await readJson(req);
  const level = body.level as RiskLevel;
  if (!LEVELS.includes(level)) throw new HttpError(400, "Invalid level");
  const indicatorIds = (Array.isArray(body.indicatorIds) ? body.indicatorIds : [])
    .filter((x): x is string => typeof x === "string" && INDICATOR_IDS.includes(x))
    .slice(0, 20);
  const language = (LANGUAGE_CODES as string[]).includes(body.language as string) ? (body.language as LanguageCode) : hh.language;
  const startedAt = typeof body.startedAt === "string" && !isNaN(Date.parse(body.startedAt)) ? body.startedAt : new Date().toISOString();

  const sessionId = randomId("ses");
  await write((db) => {
    db.sessions.unshift({
      id: sessionId,
      householdId: hh.id,
      startedAt,
      endedAt: new Date().toISOString(),
      language,
      level,
      indicatorIds,
    });
    db.sessions = db.sessions.slice(0, 500);
  });

  let alertId: string | undefined;
  const consented = body.sendAlert === true && hh.alertConsent !== "never";
  if (consented && level !== "unclear") {
    const ackToken = randomToken(18);
    alertId = await createAlert({ householdId: hh.id, sessionId, level, indicatorIds, ackToken, ackTokenHash: hashToken(ackToken) });
  }

  return ok(
    read((db) => ({
      session: toSession(db.sessions.find((s) => s.id === sessionId)!),
      alert: alertId ? toAlert(db, db.alerts.find((a) => a.id === alertId)!) : null,
    })),
    { status: 201 },
  );
});
