import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { AlertConsent, AlertStatus, DeliveryStatus, LanguageCode, RiskLevel } from "@/lib/types";

/**
 * Ruko's storage. Two interchangeable backends behind the same read()/write() API:
 *
 *  - Redis (Upstash REST) — used whenever UPSTASH_REDIS_REST_URL/TOKEN (or Vercel's
 *    KV_REST_API_URL/TOKEN) are set. Required on Vercel, whose filesystem is read-only.
 *    The whole dataset is one JSON document; writes take a short distributed lock so
 *    concurrent serverless instances never overwrite each other.
 *  - Local JSON file in .data/ — for development, with atomic writes and a write queue.
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
  /** Encrypted message text (it contains the elder's name). `body` is legacy plaintext. */
  bodyEnc?: string;
  body?: string;
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
const KEY = process.env.RUKO_REDIS_KEY || "ruko:db";
const LOCK_KEY = `${KEY}:lock`;

const empty = (): DBShape => ({
  households: [],
  contacts: [],
  sessions: [],
  alerts: [],
  users: [],
  authSessions: [],
  outbox: [],
});

/** Keeps the document well under Upstash's request-size limit. */
function trim(db: DBShape) {
  db.sessions = db.sessions.slice(0, 2000);
  db.alerts = db.alerts.slice(0, 2000);
  db.outbox = db.outbox.slice(0, 200);
  const now = new Date();
  db.authSessions = db.authSessions.filter((s) => new Date(s.expiresAt) > now);
}

/* ---------------- Redis backend (Upstash REST API, no SDK needed) ---------------- */

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function storageBackend(): "redis" | "file" {
  return redisConfig() ? "redis" : "file";
}

async function redis<T = unknown>(command: (string | number)[]): Promise<T> {
  const cfg = redisConfig()!;
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!res.ok || data.error) throw new Error(`Redis error: ${data.error ?? res.status}`);
  return data.result as T;
}

async function redisLoad(): Promise<DBShape> {
  const raw = await redis<string | null>(["GET", KEY]);
  return raw ? { ...empty(), ...(JSON.parse(raw) as Partial<DBShape>) } : empty();
}

const RELEASE = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

async function withRedisLock<T>(fn: () => Promise<T>): Promise<T> {
  const token = crypto.randomUUID();
  const deadline = Date.now() + 10_000;
  while ((await redis<string | null>(["SET", LOCK_KEY, token, "NX", "PX", 10_000])) !== "OK") {
    if (Date.now() > deadline) throw new Error("Storage is busy. Please try again.");
    await new Promise((r) => setTimeout(r, 60 + Math.random() * 120));
  }
  try {
    return await fn();
  } finally {
    await redis(["EVAL", RELEASE, 1, LOCK_KEY, token]).catch(() => undefined);
  }
}

/* ---------------- File backend (development) ---------------- */

type GlobalWithDb = typeof globalThis & { __rukoDb?: DBShape; __rukoQueue?: Promise<unknown> };
const g = globalThis as GlobalWithDb;

function fileLoad(): DBShape {
  if (g.__rukoDb) return g.__rukoDb;
  try {
    g.__rukoDb = { ...empty(), ...(JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Partial<DBShape>) };
  } catch {
    g.__rukoDb = empty();
  }
  return g.__rukoDb;
}

function filePersist(db: DBShape) {
  if (process.env.VERCEL) {
    throw new Error("Storage isn't configured. Connect Upstash Redis to this Vercel project (see README).");
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1), { mode: 0o600 });
  fs.renameSync(tmp, DB_FILE);
}

/* ---------------- Public API ---------------- */

/** Read-only access to a consistent snapshot. */
export async function read<T>(fn: (db: DBShape) => T): Promise<T> {
  return fn(redisConfig() ? await redisLoad() : fileLoad());
}

/** Serialised read-modify-write. The callback mutates `db` in place. */
export function write<T>(fn: (db: DBShape) => T | Promise<T>): Promise<T> {
  if (redisConfig()) {
    return withRedisLock(async () => {
      const db = await redisLoad();
      const result = await fn(db);
      trim(db);
      await redis(["SET", KEY, JSON.stringify(db)]);
      return result;
    });
  }
  const run = async () => {
    const db = fileLoad();
    const result = await fn(db);
    trim(db);
    filePersist(db);
    return result;
  };
  const next = (g.__rukoQueue ?? Promise.resolve()).then(run, run);
  g.__rukoQueue = next.catch(() => undefined);
  return next;
}
