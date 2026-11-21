import "server-only";
import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Wraps a route handler: converts thrown HttpErrors into JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      console.error("[ruko] unhandled", e);
      return fail(500, "Something went wrong. Please try again.");
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new HttpError(415, "Expected JSON");
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export function str(v: unknown, field: string, opts: { min?: number; max?: number; optional?: boolean } = {}): string {
  if (v === undefined || v === null || v === "") {
    if (opts.optional) return "";
    throw new HttpError(400, `${field} is required`);
  }
  if (typeof v !== "string") throw new HttpError(400, `${field} must be text`);
  const s = v.trim();
  if (opts.min && s.length < opts.min) throw new HttpError(400, `${field} is too short`);
  if (s.length > (opts.max ?? 200)) throw new HttpError(400, `${field} is too long`);
  return s;
}

/** Normalises Indian and international numbers to E.164. Accepts 10-digit Indian mobiles. */
export function normalisePhone(v: unknown): string {
  const raw = str(v, "Phone number", { max: 24 });
  const digits = raw.replace(/[^\d+]/g, "");
  let e164: string;
  if (/^[6-9]\d{9}$/.test(digits)) e164 = `+91${digits}`;
  else if (/^0[6-9]\d{9}$/.test(digits)) e164 = `+91${digits.slice(1)}`;
  else if (/^91[6-9]\d{9}$/.test(digits)) e164 = `+${digits}`;
  else if (/^\+\d{8,15}$/.test(digits)) e164 = digits;
  else throw new HttpError(400, "Please enter a valid phone number, e.g. 98765 43210");
  return e164;
}

export function maskPhone(e164: string): string {
  return e164.length > 6 ? `${e164.slice(0, 3)} ••••• ${e164.slice(-3)}` : "•••";
}

const buckets = new Map<string, { count: number; reset: number }>();
/** Very small in-memory rate limiter for auth endpoints. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  b.count++;
  if (b.count > limit) throw new HttpError(429, "Too many attempts. Please wait a minute and try again.");
}

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
