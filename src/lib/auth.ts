import crypto from "crypto";
import { cookies } from "next/headers";
import { getServiceClient } from "./supabase";

const COOKIE_NAME = "gb_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET ist nicht gesetzt.");
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Create a signed session token. */
export function createSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `v1.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [ver, expStr, mac] = parts;
  const payload = `${ver}.${expStr}`;
  const expected = sign(payload);
  if (
    mac.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  ) {
    return false;
  }
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  return true;
}

export const COOKIE = {
  name: COOKIE_NAME,
  ttl: SESSION_TTL_SECONDS,
};

/** Read the current request's admin session state. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_NAME)?.value);
}

/**
 * Verify a password against the hash stored in Supabase (table app_config,
 * key = "admin_password_hash"). If no hash is stored yet, the first submitted
 * password is used to bootstrap it (initial setup over the secret admin link).
 */
export async function verifyPassword(
  password: string
): Promise<{ ok: boolean; bootstrapped: boolean }> {
  const plain = (password ?? "").trim();
  if (!plain) return { ok: false, bootstrapped: false };

  const supabase = getServiceClient();
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "admin_password_hash")
    .maybeSingle();

  const stored = data?.value as string | undefined;
  const incoming = sha256(plain);

  if (!stored) {
    // Bootstrap: store the first password the operator sets.
    await supabase
      .from("app_config")
      .upsert({ key: "admin_password_hash", value: incoming }, { onConflict: "key" });
    return { ok: true, bootstrapped: true };
  }

  const ok =
    stored.length === incoming.length &&
    crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(incoming));
  return { ok, bootstrapped: false };
}

/** Update the stored admin password hash (only when already authenticated). */
export async function setPassword(newPassword: string): Promise<boolean> {
  const plain = (newPassword ?? "").trim();
  if (plain.length < 6) return false;
  const supabase = getServiceClient();
  await supabase
    .from("app_config")
    .upsert(
      { key: "admin_password_hash", value: sha256(plain) },
      { onConflict: "key" }
    );
  return true;
}
