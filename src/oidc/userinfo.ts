import type { OAuthToken } from "../entities/token.entity.js";
import { ErrorType, HttpStatus, OAuthException } from "../exceptions/oauth.exception.js";
import type { OidcOptions } from "../options.js";
import type { RequestInterface } from "../requests/request.js";
import { OAuthResponse, type ResponseInterface } from "../responses/response.js";
import { AccessTokenVerifier, type AccessTokenPayload } from "./access_token_verifier.js";
import { filterOidcClaimsByScope } from "./claims.js";
import { oidcSubjectIdentifier } from "./subject.js";

const WWW_AUTHENTICATE = "www-authenticate";

export interface UserInfoDependencies {
  verifier: AccessTokenVerifier;
  oidc: OidcOptions;
  scopeDelimiter: string;
  getByAccessToken?: (accessTokenToken: string) => Promise<OAuthToken>;
  isAccessTokenRevoked?: (accessToken: OAuthToken) => Promise<boolean>;
}

function extractBearerToken(req: RequestInterface): string {
  const header = req.headers?.authorization ?? req.headers?.Authorization;
  if (typeof header === "string" && header.length > 0) return header;

  const fromBody = req.body?.access_token;
  if (typeof fromBody === "string" && fromBody.length > 0) return fromBody;

  const fromQuery = req.query?.access_token;
  if (typeof fromQuery === "string" && fromQuery.length > 0) return fromQuery;

  throw OAuthException.invalidToken("Missing access token");
}

// The error description can originate from a JWT-library message derived from
// attacker-supplied token bytes. Strip the double-quote, backslash and control
// characters that could otherwise break out of the WWW-Authenticate
// quoted-string and inject extra auth-scheme parameters or split the response.
function sanitizeHeaderValue(value: string): string {
  let sanitized = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    const isControl = code < 0x20 || code === 0x7f;
    const isQuote = code === 0x22;
    const isBackslash = code === 0x5c;
    if (isControl || isQuote || isBackslash) continue;
    sanitized += char;
  }
  return sanitized;
}

function invalidTokenResponse(description: string): ResponseInterface {
  return new OAuthResponse({
    status: HttpStatus.UNAUTHORIZED,
    headers: {
      "content-type": "application/json",
      [WWW_AUTHENTICATE]: `Bearer error="invalid_token", error_description="${sanitizeHeaderValue(description)}"`,
    },
    body: { error: "invalid_token", error_description: description },
  });
}

function insufficientScopeResponse(): ResponseInterface {
  return new OAuthResponse({
    status: HttpStatus.FORBIDDEN,
    headers: {
      "content-type": "application/json",
      [WWW_AUTHENTICATE]: `Bearer error="insufficient_scope", error_description="openid scope required", scope="openid"`,
    },
    body: { error: "insufficient_scope", error_description: "openid scope required" },
  });
}

async function isRevoked(
  getByAccessToken: NonNullable<UserInfoDependencies["getByAccessToken"]>,
  jti: string,
  isAccessTokenRevoked?: UserInfoDependencies["isAccessTokenRevoked"],
): Promise<boolean> {
  let stored: OAuthToken | undefined;
  try {
    stored = await getByAccessToken(jti);
  } catch {
    stored = undefined;
  }

  if (!stored) return true;

  // Flag-based revocation: the row still exists (possibly with a future expiry)
  // but the consumer has marked it revoked.
  if (isAccessTokenRevoked && (await isAccessTokenRevoked(stored))) return true;

  const expiresAt = stored.accessTokenExpiresAt ?? new Date(0);
  return expiresAt.getTime() <= Date.now();
}

/**
 * UserInfo endpoint handler. Verification is delegated to the AccessTokenVerifier
 * seam (which owns the algorithm pin, typ:at+jwt check, and iss equality), so
 * this handler only translates seam failures into the RFC 6750 bearer error
 * responses and assembles the scope-filtered claims body. `sub` is always taken
 * from the access token's canonical subject and applied last, so a consumer's
 * getUserClaims can never overwrite it.
 */
export async function handleUserInfoRequest(
  req: RequestInterface,
  deps: UserInfoDependencies,
): Promise<ResponseInterface> {
  let payload: AccessTokenPayload;
  try {
    payload = await deps.verifier.verify(extractBearerToken(req));
  } catch (error) {
    if (error instanceof OAuthException && error.errorType === ErrorType.InvalidToken) {
      return invalidTokenResponse(error.errorDescription ?? "Access token verification failed");
    }
    throw error;
  }

  const grantedScopes = typeof payload.scope === "string" ? payload.scope : "";
  if (!grantedScopes.split(deps.scopeDelimiter).includes("openid")) {
    return insufficientScopeResponse();
  }

  if (payload.sub == null) {
    return invalidTokenResponse("Access token is missing a subject");
  }
  const subject = oidcSubjectIdentifier(payload.sub);

  if (
    deps.getByAccessToken &&
    typeof payload.jti === "string" &&
    (await isRevoked(deps.getByAccessToken, payload.jti, deps.isAccessTokenRevoked))
  ) {
    return invalidTokenResponse("Access token has been revoked");
  }

  const claims = await deps.oidc.getUserClaims(subject);
  const { sub: _omitConsumerSub, ...scopedClaims } = filterOidcClaimsByScope(
    claims,
    grantedScopes,
    deps.scopeDelimiter,
  );

  return new OAuthResponse({
    status: HttpStatus.OK,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: { ...scopedClaims, sub: subject },
  });
}
