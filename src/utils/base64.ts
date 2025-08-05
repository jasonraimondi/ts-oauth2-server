/**
 * Encodes a string or Buffer to base64.
 *
 * @param str - String or Buffer to encode
 * @returns Base64 encoded string
 *
 * @example
 * ```ts
 * import { base64encode } from "@jmondi/oauth2-server";
 *
 * const basicAuth = "Basic " + base64encode(`${clientId}:${clientSecret}`);
 * ```
 */
export function base64encode(str: string | Buffer): string {
  if (typeof str === "string") str = Buffer.from(str);
  return str.toString("base64");
}

/**
 * Decodes a base64 string or Buffer to a binary string.
 *
 * @param str - Base64 string or Buffer to decode
 * @returns Decoded binary string
 */
export function base64decode(str: string | Buffer): string {
  if (typeof str === "string") str = Buffer.from(str, "base64");
  return str.toString("binary");
}

/**
 * Encodes a string or Buffer to base64url format (URL-safe base64).
 * Replaces + with -, / with _, and removes padding =.
 *
 * @param str - String or Buffer to encode
 * @returns Base64url encoded string
 */
export function base64urlencode(str: string | Buffer): string {
  return base64encode(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
