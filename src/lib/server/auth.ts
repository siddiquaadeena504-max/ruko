import "server-only";
import { cookies } from "next/headers";
import { read, write, type HouseholdRecord, type UserRecord } from "./db";
import { hashToken, randomToken, safeEqualHex } from "./crypto";
import { HttpError } from "./http";

const COOKIE = "ruko_family";
const SESSION_DAYS = 14;

/* ---------- Family accounts (cookie sessions) ---------- */

export async function startSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await write((db) => {
    db.authSessions = db.authSessions.filter((s) => new Date(s.expiresAt) > new Date());
    db.authSessions.push({ tokenHash: hashToken(token), userId, expiresAt: expiresAt.toISOString() });
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const h = hashToken(token);
    await write((db) => {
      db.authSessions = db.authSessions.filter((s) => s.tokenHash !== h);
    });
  }
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<UserRecord | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const h = hashToken(token);
  return read((db) => {
    const s = db.authSessions.find((x) => x.tokenHash === h && new Date(x.expiresAt) > new Date());
    return s ? db.users.find((u) => u.id === s.userId) ?? null : null;
  });
}

export async function requireUser(): Promise<UserRecord> {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Please sign in");
  return u;
}

/* ---------- Elder device (bearer token in header) ---------- */

export function deviceHousehold(req: Request): HouseholdRecord | null {
  const token = req.headers.get("x-ruko-device");
  if (!token) return null;
  const h = hashToken(token);
  return read((db) => db.households.find((x) => safeEqualHex(x.deviceTokenHash, h)) ?? null);
}

export function requireDevice(req: Request): HouseholdRecord {
  const hh = deviceHousehold(req);
  if (!hh) throw new HttpError(401, "This device is not set up. Please open Ruko's setup again.");
  return hh;
}

/** A household is accessible by its own device or by a linked family account. */
export async function requireHouseholdAccess(req: Request, householdId: string): Promise<{ household: HouseholdRecord; userId?: string }> {
  const dev = deviceHousehold(req);
  if (dev && dev.id === householdId) return { household: dev };
  const user = await currentUser();
  if (user) {
    const hh = read((db) => db.households.find((h) => h.id === householdId));
    if (hh && hh.linkedUserIds.includes(user.id)) return { household: hh, userId: user.id };
  }
  throw new HttpError(403, "You don't have access to this household");
}
