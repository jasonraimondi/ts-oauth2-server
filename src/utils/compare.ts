import { timingSafeEqual } from "crypto";

/**
 * Constant-time string comparison for values whose equality gates a security
 * decision (code challenges, code verifiers). `timingSafeEqual` requires equal
 * byte lengths, so unequal lengths short-circuit — the length of a challenge is
 * not itself a secret.
 */
export function timingSafeCompare(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");

  if (leftBytes.length !== rightBytes.length) return false;

  return timingSafeEqual(leftBytes, rightBytes);
}
