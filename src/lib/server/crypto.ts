import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");

let cachedKey: Buffer | null = null;

/** AES-256 key: from RUKO_ENCRYPTION_KEY, or a dev key persisted in .data/secret.key. */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const env = process.env.RUKO_ENCRYPTION_KEY?.trim();
  if (env) {
    const buf = Buffer.from(env, "hex");
    if (buf.length !== 32) throw new Error("RUKO_ENCRYPTION_KEY must be 64 hex characters (32 bytes).");
    cachedKey = buf;
    return buf;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("RUKO_ENCRYPTION_KEY is required in production.");
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, "secret.key");
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  cachedKey = Buffer.from(fs.readFileSync(file, "utf8").trim(), "hex");
  return cachedKey;
}

/** Encrypts a string with AES-256-GCM. Output: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(payload: string): string {
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== "v1" || !iv || !tag || ct === undefined) throw new Error("Bad ciphertext");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

/** Keyed hash for values we need to look up (e.g. email) without storing them in plain text. */
export function lookupHash(value: string): string {
  return crypto.createHmac("sha256", getKey()).update(value.trim().toLowerCase()).digest("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(9).toString("base64url")}`;
}

export function randomDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += crypto.randomInt(0, 10).toString();
  return s;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt.${salt.toString("base64url")}.${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [alg, salt, hash] = stored.split(".");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = crypto.scryptSync(password, Buffer.from(salt, "base64url"), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
