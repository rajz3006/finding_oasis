import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time check of `Authorization: Bearer <secret>`. Fails closed when the secret is unset. */
export function bearerMatches(header: string | null | undefined, secret: string | null | undefined): boolean {
  if (!secret || !header) return false;
  const m = /^Bearer (.+)$/.exec(header);
  if (!m) return false;
  // Hash both sides so lengths match and timing doesn't leak the secret length.
  const a = createHash("sha256").update(m[1]).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}
