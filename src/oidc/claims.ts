/**
 * The OIDC standard scope-to-claim mapping (OIDC Core §5.4). Each scope
 * authorizes the claims listed against it, and {@link filterOidcClaimsByScope}
 * uses the table to trim a claims resolver's output down to what the Granted
 * Scopes permit.
 */
export const OIDC_SCOPE_CLAIMS = {
  profile: [
    "name",
    "family_name",
    "given_name",
    "middle_name",
    "nickname",
    "preferred_username",
    "profile",
    "picture",
    "website",
    "gender",
    "birthdate",
    "zoneinfo",
    "locale",
    "updated_at",
  ],
  email: ["email", "email_verified"],
  address: ["address"],
  phone: ["phone_number", "phone_number_verified"],
} as const;

/** A scope name that appears in {@link OIDC_SCOPE_CLAIMS}. */
export type OidcStandardScope = keyof typeof OIDC_SCOPE_CLAIMS;
/** A claim name that any scope in {@link OIDC_SCOPE_CLAIMS} authorizes. */
export type OidcStandardClaim = (typeof OIDC_SCOPE_CLAIMS)[OidcStandardScope][number];

/**
 * Scopes the library auto-recognizes as valid when OIDC is enabled, so consumers
 * need not register them in their scope repository. `offline_access` is
 * intentionally excluded in v1: refresh-token issuance is consumer-owned and no
 * ID token is issued on refresh, so advertising it would mislead relying parties.
 */
export const OIDC_AUTO_RECOGNIZED_SCOPES: readonly string[] = ["openid", ...Object.keys(OIDC_SCOPE_CLAIMS)];

/**
 * Reports whether a scope is one the library recognizes without registration.
 *
 * @param scope - The scope name to test
 * @returns `true` when the scope is in {@link OIDC_AUTO_RECOGNIZED_SCOPES}
 */
export function isAutoRecognizedOidcScope(scope: string): boolean {
  return OIDC_AUTO_RECOGNIZED_SCOPES.includes(scope);
}

/** The `address` claim, a structured value per OIDC Core §5.1.1. */
export interface OidcAddressClaim {
  formatted?: string;
  street_address?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  [claim: string]: unknown;
}

/**
 * The end-user attributes your {@link OidcGetUserClaims} resolver returns. Only
 * `sub` is required; the standard OIDC claims are typed, and the index
 * signature accepts your own. The library filters the result by the Granted
 * Scopes before it serves the UserInfo response, so returning more than the
 * scopes authorize is safe.
 *
 * @see https://tsoauth2server.com/docs/endpoints/userinfo
 */
export interface OidcUserClaims {
  sub: string;
  name?: string;
  family_name?: string;
  given_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  updated_at?: number;
  email?: string;
  email_verified?: boolean;
  address?: OidcAddressClaim;
  phone_number?: string;
  phone_number_verified?: boolean;
  [claim: string]: unknown;
}

/** {@link OidcUserClaims} after scope filtering. Every claim except `sub` is optional. */
export type FilteredOidcUserClaims = Pick<OidcUserClaims, "sub"> & Partial<Omit<OidcUserClaims, "sub">>;
/**
 * The Granted Scopes, in any of the forms the library holds them: the delimited
 * string from a token's `scope` claim, an array of names, or an array of
 * {@link OAuthScope} entities.
 */
export type GrantedOidcScopes = string | readonly (string | { name: string })[];

function isOidcStandardScope(scope: string): scope is OidcStandardScope {
  return Object.hasOwn(OIDC_SCOPE_CLAIMS, scope);
}

function normalizeGrantedScopes(grantedScopes: GrantedOidcScopes, scopeDelimiter: string): string[] {
  if (typeof grantedScopes === "string") {
    return grantedScopes.split(scopeDelimiter).filter(scope => scope.length > 0);
  }

  return grantedScopes.map(scope => (typeof scope === "string" ? scope : scope.name));
}

/**
 * Trims a claims resolver's output down to the claims the Granted Scopes
 * authorize (OIDC Core §5.4). Unknown scopes contribute nothing, and `sub` is
 * always kept.
 *
 * @param claims - The claims the consumer's resolver returned
 * @param grantedScopes - The scopes the token carries
 * @param scopeDelimiter - The delimiter to split a scope string on, a space by default
 * @returns The claims the granted scopes authorize
 */
export function filterOidcClaimsByScope(
  claims: OidcUserClaims,
  grantedScopes: GrantedOidcScopes,
  scopeDelimiter = " ",
): FilteredOidcUserClaims {
  const allowedClaims = new Set<string>(["sub"]);

  for (const scope of normalizeGrantedScopes(grantedScopes, scopeDelimiter)) {
    if (!isOidcStandardScope(scope)) {
      continue;
    }

    for (const claim of OIDC_SCOPE_CLAIMS[scope]) {
      allowedClaims.add(claim);
    }
  }

  const filteredClaims: FilteredOidcUserClaims = { sub: claims.sub };

  for (const [claim, value] of Object.entries(claims)) {
    if (claim === "sub" || !allowedClaims.has(claim)) {
      continue;
    }

    filteredClaims[claim] = value;
  }

  return filteredClaims;
}
