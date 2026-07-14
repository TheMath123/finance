import { SignJWT, jwtVerify } from "jose";

/** Token opaco (refresh, reset, verificação): random 256-bit, guardado como hash SHA-256. */
export function generateOpaqueToken(): { raw: string; hash: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = Buffer.from(bytes).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return new Bun.CryptoHasher("sha256").update(raw).digest("hex");
}

const ACCESS_TOKEN_TTL = "15m";

export async function signAccessToken(secret: string, userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(new TextEncoder().encode(secret));
}

export async function verifyAccessToken(
  secret: string,
  token: string,
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.sub ? { userId: payload.sub } : null;
  } catch {
    return null;
  }
}

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos
export const VERIFY_EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
