import { randomBytes } from "crypto";

/**
 * Generates a random hexadecimal string, for use as a token or code identifier.
 * The bytes come from the Node crypto module.
 *
 * @param len - Length of the returned string, 80 characters by default
 * @returns A random hexadecimal string
 *
 * @example
 * ```ts
 * import { generateRandomToken } from "@jmondi/oauth2-server";
 *
 * const authCode = { code: generateRandomToken(), ... };
 * ```
 */
export function generateRandomToken(len = 80): string {
  return randomBytes(len / 2).toString("hex");
}
