import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import getDb, { ApiKey, User } from "./db";

const SESSION_COOKIE = "bl_session";
const SESSION_DAYS = 30;

// -- Password hashing (scrypt, no external deps) --

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// -- Sessions --

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expires.toISOString());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
    .get(token) as User | undefined;
  if (!row) return null;

  // The app's owner (ADMIN_EMAIL) always has paid-plan access — self-heals
  // on first load after this check was added, or after any accidental
  // downgrade, so it never needs a manual flip on /admin/users.
  if (row.plan !== "pro" && isAdmin(row)) {
    getDb().prepare("UPDATE users SET plan = 'pro' WHERE id = ?").run(row.id);
    row.plan = "pro";
  }
  return row;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Single-owner admin gate: set ADMIN_EMAIL in the environment to the one
// account that should see /admin. Everyone else is redirected away, and if
// the env var is unset nobody gets in — there's no default admin email
// baked into the source.
export function isAdmin(user: Pick<User, "email">): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail && user.email.toLowerCase() === adminEmail.toLowerCase();
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  store.delete(SESSION_COOKIE);
}

// Ownership guard: returns the project only if it belongs to the user
export function getOwnedProject(projectId: number, userId: number) {
  return getDb()
    .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?")
    .get(projectId, userId);
}

// -- API keys (paid-plan REST API access) --

// Any plan other than the 'free' default can use the API. There's no
// billing wired up yet — the app owner is always 'pro' (see getCurrentUser);
// everyone else is flipped to 'pro' manually from /admin/users.
export function canUseApi(user: Pick<User, "plan">): boolean {
  return user.plan !== "free";
}

function hashApiKey(key: string): string {
  // Unlike a password, an API key is already high-entropy (192 random bits),
  // so a fast hash is fine here — scrypt's slowness defends against guessing
  // a low-entropy secret, which doesn't apply.
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Returns the raw key alongside its stored record. The raw key is shown to
// the user exactly once, here — only its hash and a short display prefix
// are persisted, so it can never be recovered after this call returns.
export function createApiKey(userId: number, name: string): { key: string; record: ApiKey } {
  const key = `rl_live_${crypto.randomBytes(24).toString("hex")}`;
  const prefix = key.slice(0, 14);
  const result = getDb()
    .prepare("INSERT INTO api_keys (user_id, name, key_prefix, key_hash) VALUES (?, ?, ?, ?)")
    .run(userId, name || "API key", prefix, hashApiKey(key));
  const record = getDb()
    .prepare("SELECT id, user_id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as ApiKey;
  return { key, record };
}

export function listApiKeys(userId: number): ApiKey[] {
  return getDb()
    .prepare(
      "SELECT id, user_id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(userId) as ApiKey[];
}

export function revokeApiKey(userId: number, keyId: number) {
  getDb().prepare("DELETE FROM api_keys WHERE id = ? AND user_id = ?").run(keyId, userId);
}

// Looks up the user behind a raw API key sent on an incoming request, and
// records the hit. Returns null for an unknown, revoked, or malformed key.
export function getUserFromApiKey(key: string): User | null {
  if (!key.startsWith("rl_")) return null;
  const hash = hashApiKey(key);
  const user = getDb()
    .prepare("SELECT u.* FROM api_keys k JOIN users u ON u.id = k.user_id WHERE k.key_hash = ?")
    .get(hash) as User | undefined;
  if (!user) return null;
  getDb().prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE key_hash = ?").run(hash);
  return user;
}
