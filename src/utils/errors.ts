import { OAuthException } from "../exceptions/oauth.exception.js";

export function isOAuthError(error: unknown): error is OAuthException {
  if (!error) return false;
  if (typeof error !== "object") return false;
  return "oauth" in error;
}
