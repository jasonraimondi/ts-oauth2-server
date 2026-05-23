import { OAuthException } from "../exceptions/oauth.exception.js";
import type { AuthorizationServerOptions } from "../options.js";
import type { JwtInterface } from "../utils/jwt.js";

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

export class AccessTokenVerifier {
  constructor(
    private readonly jwt: JwtInterface,
    private readonly options: AuthorizationServerOptions,
  ) {}

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

    return payload as AccessTokenPayload;
  }
}
