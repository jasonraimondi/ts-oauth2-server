import { OAuthException } from "../exceptions/oauth.exception.js";

/**
 * Reports whether a caught value is an {@link OAuthException}. The adapters use
 * it to tell an OAuth error, which becomes an RFC 6749 §5.2 error response,
 * from an unexpected error, which becomes a 500.
 *
 * @param error - The caught value
 * @returns `true` when the value is an OAuth error
 */
export function isOAuthError(error: unknown): error is OAuthException {
  if (!error) return false;
  if (typeof error !== "object") return false;
  return "oauth" in error;
}
