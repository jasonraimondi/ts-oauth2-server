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

export type OidcStandardScope = keyof typeof OIDC_SCOPE_CLAIMS;
export type OidcStandardClaim = (typeof OIDC_SCOPE_CLAIMS)[OidcStandardScope][number];

export interface OidcAddressClaim {
  formatted?: string;
  street_address?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  [claim: string]: unknown;
}

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

export type FilteredOidcUserClaims = Pick<OidcUserClaims, "sub"> & Partial<Omit<OidcUserClaims, "sub">>;
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
