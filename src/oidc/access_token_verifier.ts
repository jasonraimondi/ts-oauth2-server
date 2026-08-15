import { OAuthException } from "../exceptions/oauth.exception.js";
import type { AuthorizationServerOptions } from "../options.js";
import type { JwtInterface } from "../utils/jwt.js";

/**
 * The verified claims of an OIDC access token, per RFC 9068. `iss` is always
 * present because {@link AccessTokenVerifier} rejects a token whose issuer does
 * not match the server's. `jti` is the identifier of the persisted
 * {@link OAuthToken}, and `cid` is the client the token was issued to.
 */
export interface AccessTokenPayload {
  iss: string;
  aud?: string | string[];
  sub?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  cid?: string;
  scope?: string;
  [claim: string]: unknown;
}

interface JoseHeader {
  alg?: unknown;
  typ?: unknown;
  [claim: string]: unknown;
}

function bearerToken(rawBearer: string): string {
  const trimmed = rawBearer.trim();
  if (trimmed.toLowerCase().startsWith("bearer ")) {
    return trimmed.slice("bearer ".length).trim();
  }

  return trimmed;
}

function decodeJoseHeader(token: string): JoseHeader {
  const [encodedHeader] = token.split(".");
  if (!encodedHeader) {
    throw OAuthException.invalidToken("Malformed access token");
  }

  try {
    const decoded = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as unknown;
    if (typeof decoded === "object" && decoded !== null && !Array.isArray(decoded)) {
      return decoded as JoseHeader;
    }
  } catch {
    throw OAuthException.invalidToken("Malformed access token");
  }

  throw OAuthException.invalidToken("Malformed access token");
}

/**
 * Verifies an OIDC access token. This class is the single home for those
 * checks, so a custom {@link JwtInterface} that does not pin algorithms cannot
 * weaken them.
 *
 * A token must satisfy all of: a `typ` header of `at+jwt`, an `alg` header of
 * `RS256`, a valid signature, an `iss` equal to the server's issuer, an `exp`
 * in the future, and an `nbf` that has passed. Lifetime is asserted here rather
 * than left to the injected {@link JwtInterface}, which a consumer could
 * configure to ignore expiry.
 *
 * UserInfo uses it, and a resource server can reuse it to protect its own
 * endpoints.
 *
 * @see https://tsoauth2server.com/docs/getting_started/protecting_resources
 */
export class AccessTokenVerifier {
  constructor(
    private readonly jwt: JwtInterface,
    private readonly options: AuthorizationServerOptions,
  ) {}

  /**
   * Verifies an access token and returns its claims.
   *
   * @param rawBearer - The token, with or without the `Bearer ` prefix
   * @returns The verified claims
   * @throws {OAuthException} `invalid_token` when any check fails
   */
  async verify(rawBearer: string): Promise<AccessTokenPayload> {
    const token = bearerToken(rawBearer);
    const header = decodeJoseHeader(token);

    if (header.typ !== "at+jwt") {
      throw OAuthException.invalidToken("Access token typ must be at+jwt");
    }

    if (header.alg !== "RS256") {
      throw OAuthException.invalidToken("Access token alg must be RS256");
    }

    let payload: Record<string, unknown>;
    try {
      payload = await this.jwt.verify(token);
    } catch (error) {
      throw OAuthException.invalidToken(error instanceof Error ? error.message : "Access token verification failed");
    }

    if (typeof payload.iss !== "string" || payload.iss !== this.options.issuer) {
      throw OAuthException.invalidToken("Access token issuer mismatch");
    }

    // Lifetime is asserted here rather than left to the injected JwtInterface: a
    // consumer service that verifies with `ignoreExpiration` (or omits `exp`
    // entirely, which RFC 9068 §2.2 forbids) would otherwise let an expired
    // token authenticate a resource request.
    const now = Math.floor(Date.now() / 1000);

    if (typeof payload.exp !== "number" || payload.exp <= now) {
      throw OAuthException.invalidToken("Access token is expired");
    }

    if (typeof payload.nbf === "number" && payload.nbf > now) {
      throw OAuthException.invalidToken("Access token is not yet valid");
    }

    return payload as AccessTokenPayload;
  }
}
