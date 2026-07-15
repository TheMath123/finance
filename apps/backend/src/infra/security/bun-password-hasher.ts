import type { PasswordHasher } from "../../application/ports/password-hasher";

/** bcrypt cost 12 via Bun.password (spec: Auth). */
export const bunPasswordHasher: PasswordHasher = {
  hash: (password) => Bun.password.hash(password, { algorithm: "bcrypt", cost: 12 }),
  verify: (password, hash) => Bun.password.verify(password, hash),
};
