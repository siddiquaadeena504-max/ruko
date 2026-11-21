import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { AlertConsent, AlertStatus, DeliveryStatus, LanguageCode, RiskLevel } from "@/lib/types";

/**
 * A small JSON-file database with atomic writes and a serialised write queue.
 * The repository functions below are the only place that touches storage, so swapping
 * this for Postgres/SQLite later only means re-implementing this module.
 *
 * Sensitive fields (names, phone numbers, emails) are stored encrypted (fields ending in `Enc`).
 * Conversation transcripts are never stored on the server.
 */

export interface HouseholdRecord {
  id: string;
  deviceTokenHash: string;
  elderNameEnc: string;
  language: LanguageCode;
  voice: { enabled: boolean; rate: "slow" | "normal" };
  alertConsent: AlertConsent;
  escalateAfterSec: number;
  pairing?: { codeHash: string; expiresAt: string };
  linkedUserIds: string[];
  createdAt: string;
  isDemo?: boolean;
}

export interface ContactRecord {
  id: string;
  householdId: string;
  nameEnc: string;
  phoneEnc: string;
  relation: string;
  priority: number;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  householdId: string;
  startedAt: string;
  endedAt: string;
  language: LanguageCode;
  level: RiskLevel;
  indicatorIds: string[];
  alertId?: string;
}

export interface DeliveryRecord {
  contactId: string;
  contactNameEnc: string;
  phoneMasked: string;
  attemptedAt: string;
  status: DeliveryStatus;
  provider: string;
  error?: string;
}

export interface AlertRecord {
  id: string;
  householdId: string;
  sessionId?: string;
  createdAt: string;
  level: RiskLevel;
  indicatorIds: string[];
  status: AlertStatus;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  escalateAfterSec: number;
  ackTokenHash: string;
  deliveries: DeliveryRecord[];
}

export interface UserRecord {
  id: string;
  emailHash: string;
  emailEnc: string;
  nameEnc: string;
  passwordHash: string;
  prefs: { alertsInDashboard: boolean; escalationReminders: boolean };
  createdAt: string;
  isDemo?: boolean;
}

export interface AuthSessionRecord {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

export interface OutboxRecord {
  id: string;
  alertId: string;
  householdId: string;
  toMasked: string;
  body: string;
  createdAt: string;
}

export interface DBShape {
  households: HouseholdRecord[];
  contacts: ContactRecord[];
  sessions: SessionRecord[];
  alerts: AlertRecord[];
  users: UserRecord[];
  authSessions: AuthSessionRecord[];
  outbox: OutboxRecord[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "ruko-db.json");

const empty = (): DBShape => ({
  households: [],
  contacts: [],
  sessions: [],
  alerts: [],
  users: [],
  authSessions: [],
  outbox: [],
});

type GlobalWithDb = typeof globalThis & { __rukoDb?: DBShape; __rukoQueue?: Promise<unknown> };
const g = globalThis as GlobalWithDb;

function load(): DBShape {
  if (g.__rukoDb) return g.__rukoDb;
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    g.__rukoDb = { ...empty(), ...(JSON.parse(raw) as Partial<DBShape>) };
  } catch {
    g.__rukoDb = empty();
  }
  return g.__rukoDb;
}

function persist(db: DBShape) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1), { mode: 0o600 });
  fs.renameSync(tmp, DB_FILE);
}

/** Read-only snapshot access. */
export function read<T>(fn: (db: DBShape) => T): T {
  return fn(load());
}

/** Serialised read-modify-write. The callback mutates `db` in place. */
export function write<T>(fn: (db: DBShape) => T | Promise<T>): Promise<T> {
  const run = async () => {
    const db = load();
    const result = await fn(db);
    persist(db);
    return result;
  };
  const next = (g.__rukoQueue ?? Promise.resolve()).then(run, run);
  g.__rukoQueue = next.catch(() => undefined);
  return next;
}
