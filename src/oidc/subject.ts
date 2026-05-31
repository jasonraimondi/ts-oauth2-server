import type { OAuthUserIdentifier } from "../entities/user.entity.js";

/**
 * Canonical OIDC subject identifier. The same stringify produces `sub` for the
 * ID token, the UserInfo response, and the `getUserClaims` key, so `sub` is
 * byte-identical everywhere. v1 uses the public subject type only.
 */
export function oidcSubjectIdentifier(userId: OAuthUserIdentifier): string {
  return String(userId);
}
