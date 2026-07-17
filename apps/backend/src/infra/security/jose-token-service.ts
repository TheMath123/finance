import { SignJWT, jwtVerify } from "jose";
import type { TokenService } from "../../application/ports/token-service";

const ACCESS_TOKEN_TTL = "15m";

export function createTokenService(jwtSecret: string): TokenService {
  const key = new TextEncoder().encode(jwtSecret);

  const hashOpaque = (raw: string): string =>
    new Bun.CryptoHasher("sha256").update(raw).digest("hex");

  return {
    signAccess: (userId) =>
      new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(ACCESS_TOKEN_TTL)
        .sign(key),
    async verifyAccess(token) {
      try {
        const { payload } = await jwtVerify(token, key);
        return payload.sub ? { userId: payload.sub } : null;
      } catch {
        return null;
      }
    },
    generateOpaque() {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const raw = Buffer.from(bytes).toString("base64url");
      return { raw, hash: hashOpaque(raw) };
    },
    generateCode() {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      const value = bytes[0] ?? 0;
      const raw = String(value % 1_000_000).padStart(6, "0");
      return { raw, hash: hashOpaque(raw) };
    },
    hashOpaque,
  };
}

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos
export const VERIFY_EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
export const WHATSAPP_LINK_TTL_MS = 5 * 60 * 1000; // 5 minutos (spec: Vínculo do WhatsApp por OTP)
