export const ADMIN_COOKIE = "rtf_admin";
export const PLAYER_COOKIE = "rtf_player";
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET non configurato");
  }
  return secret;
}

export function getAdminPassword(): string {
  const password = (
    process.env.ADMIN_PASSWORD ?? process.env.ADMIN_PIN
  )?.trim();
  if (!password) {
    throw new Error("ADMIN_PASSWORD non configurato");
  }
  return password;
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Buffer.from(sig).toString("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  const expiry = String(Date.now() + SESSION_MS);
  const sig = await hmacSign(expiry, getAuthSecret());
  return `${expiry}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;

  try {
    const secret = getAuthSecret();
    const [expiry, sig] = token.split(".");
    if (!expiry || !sig) return false;
    if (Date.now() > parseInt(expiry, 10)) return false;
    const expected = await hmacSign(expiry, secret);
    return timingSafeEqual(sig, expected);
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  try {
    return timingSafeEqual(password, getAdminPassword());
  } catch {
    return false;
  }
}

export function getPlayerPassword(): string {
  const playerPassword = process.env.PLAYER_PASSWORD?.trim();
  if (playerPassword) return playerPassword;

  if (process.env.NODE_ENV !== "production") {
    const fallback = (
      process.env.ADMIN_PASSWORD ?? process.env.ADMIN_PIN
    )?.trim();
    if (fallback) return fallback;
  }

  throw new Error("PLAYER_PASSWORD non configurato");
}

export function verifyPlayerPassword(password: string): boolean {
  try {
    return timingSafeEqual(password, getPlayerPassword());
  } catch {
    return false;
  }
}

export async function createPlayerSessionToken(): Promise<string> {
  const expiry = String(Date.now() + SESSION_MS);
  const sig = await hmacSign(`player:${expiry}`, getAuthSecret());
  return `${expiry}.${sig}`;
}

export async function verifyPlayerSessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;

  try {
    const secret = getAuthSecret();
    const [expiry, sig] = token.split(".");
    if (!expiry || !sig) return false;
    if (Date.now() > parseInt(expiry, 10)) return false;
    const expected = await hmacSign(`player:${expiry}`, secret);
    return timingSafeEqual(sig, expected);
  } catch {
    return false;
  }
}

export async function canViewSensitivePlayerData(
  adminToken: string | undefined,
  playerToken: string | undefined
): Promise<boolean> {
  if (await verifySessionToken(adminToken)) return true;
  if (await verifyPlayerSessionToken(playerToken)) return true;
  return false;
}

export function isPlayerAuthConfigured(): boolean {
  if (!process.env.AUTH_SECRET) return false;
  if (process.env.PLAYER_PASSWORD?.trim()) return true;
  if (process.env.NODE_ENV !== "production") {
    return Boolean(process.env.ADMIN_PASSWORD || process.env.ADMIN_PIN);
  }
  return false;
}

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_SECRET &&
      (process.env.ADMIN_PASSWORD || process.env.ADMIN_PIN)
  );
}
