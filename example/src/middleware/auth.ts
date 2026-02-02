import { Request, Response, NextFunction } from "express";
import { JwtInterface, OAuthToken, OAuthTokenRepository } from "@jmondi/oauth2-server";

/**
 * JWT payload structure for access tokens issued by the authorization server.
 * @see https://datatracker.ietf.org/doc/html/rfc7519
 */
export interface AccessTokenPayload {
  /** Token ID - maps to accessToken in repository (RFC 7519 Section 4.1.7) */
  jti: string;
  /** Subject - typically the user ID (RFC 7519 Section 4.1.2) */
  sub?: string;
  /** Client ID (library-specific claim) */
  cid: string;
  /** Expiration time as Unix timestamp (RFC 7519 Section 4.1.4) */
  exp: number;
  /** Issued at time as Unix timestamp (RFC 7519 Section 4.1.6) */
  iat: number;
  /** Not before time as Unix timestamp (RFC 7519 Section 4.1.5) */
  nbf?: number;
  /** Issuer (RFC 7519 Section 4.1.1) */
  iss?: string;
  /** Audience (RFC 7519 Section 4.1.3) */
  aud?: string | string[];
  /** Space-delimited scopes */
  scope?: string;
  /** Additional custom fields from extraTokenFields */
  [key: string]: unknown;
}

/**
 * Result of successful token validation.
 */
export interface ValidatedToken {
  /** Decoded JWT payload */
  payload: AccessTokenPayload;
  /** Parsed scopes as array */
  scopes: string[];
  /** Token entity from repository (includes user, client, etc.) */
  token: OAuthToken;
}

/**
 * Configuration for token validation.
 */
export interface TokenValidationConfig {
  /** JWT service for verifying token signatures */
  jwtService: JwtInterface;
  /** Token repository for checking revocation status */
  tokenRepository: OAuthTokenRepository;
  /** Expected issuer claim - reject tokens from other issuers */
  expectedIssuer?: string;
  /** Expected audience claim - reject tokens meant for other APIs */
  expectedAudience?: string;
}

/**
 * Validates an access token by verifying the JWT signature and checking revocation status.
 *
 * Security checks performed:
 * 1. JWT signature verification (prevents tampering)
 * 2. JWT expiration check (exp claim)
 * 3. Issuer validation (iss claim) - if configured
 * 4. Audience validation (aud claim) - if configured
 * 5. Repository lookup (checks revocation status)
 * 6. Expiration from repository (defense in depth)
 *
 * @param accessToken - The raw JWT access token string
 * @param config - Validation configuration
 * @returns ValidatedToken if valid, null if invalid
 *
 * @example
 * ```ts
 * const result = await validateAccessToken(token, {
 *   jwtService,
 *   tokenRepository,
 *   expectedIssuer: "https://auth.example.com",
 *   expectedAudience: "https://api.example.com",
 * });
 *
 * if (!result) {
 *   // Token is invalid
 * }
 * ```
 */
export async function validateAccessToken(
  accessToken: string,
  config: TokenValidationConfig,
): Promise<ValidatedToken | null> {
  try {
    // Step 1: Verify JWT signature and decode payload
    // This also checks: exp, nbf, iat claims
    const payload = (await config.jwtService.verify(accessToken)) as AccessTokenPayload;

    // Step 2: Validate issuer (RFC 7519 Section 4.1.1)
    // Prevents accepting tokens from untrusted authorization servers
    if (config.expectedIssuer && payload.iss !== config.expectedIssuer) {
      console.warn("[auth] Token issuer mismatch:", payload.iss);
      return null;
    }

    // Step 3: Validate audience (RFC 7519 Section 4.1.3)
    // Prevents token confusion attacks where a token meant for API-A is used on API-B
    if (config.expectedAudience) {
      const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
      if (!audiences.includes(config.expectedAudience)) {
        console.warn("[auth] Token audience mismatch:", payload.aud);
        return null;
      }
    }

    // Step 4: Check revocation status via repository
    // JWTs are stateless - we need to check if the token was revoked
    if (typeof config.tokenRepository.getByAccessToken !== "function") {
      throw new Error("TokenRepository.getByAccessToken is required for token validation");
    }

    let storedToken: OAuthToken;
    try {
      storedToken = await config.tokenRepository.getByAccessToken(payload.jti);
    } catch {
      // Token not found in repository (possibly revoked or never existed)
      console.warn("[auth] Token not found in repository:", payload.jti);
      return null;
    }

    // Step 5: Check token expiration from repository (defense in depth)
    // Belt and suspenders - verify expiration from both JWT and database
    if (storedToken.accessTokenExpiresAt < new Date()) {
      console.warn("[auth] Token expired");
      return null;
    }

    return {
      payload,
      scopes: payload.scope?.split(" ").filter(Boolean) ?? [],
      token: storedToken,
    };
  } catch (error) {
    // JWT verification failed (invalid signature, expired, malformed, etc.)
    console.warn("[auth] Token validation failed:", error);
    return null;
  }
}

/**
 * Checks if a validated token has all required scopes.
 *
 * @param token - The validated token
 * @param requiredScopes - Array of scope names that must all be present
 * @returns true if all required scopes are present
 *
 * @example
 * ```ts
 * if (!hasRequiredScopes(token, ["read", "write"])) {
 *   // Insufficient permissions
 * }
 * ```
 */
export function hasRequiredScopes(token: ValidatedToken, requiredScopes: string[]): boolean {
  return requiredScopes.every(scope => token.scopes.includes(scope));
}

// Extend Express Request type to include validated token
declare global {
  namespace Express {
    interface Request {
      /** Validated token attached by auth middleware */
      accessToken?: ValidatedToken;
    }
  }
}

/**
 * Express middleware factory for protecting routes with OAuth2 access tokens.
 *
 * Validates the Bearer token from the Authorization header and optionally
 * checks for required scopes. Attaches the validated token to `req.accessToken`.
 *
 * @param config - Token validation configuration
 * @param requiredScopes - Optional array of scopes required to access the route
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * // Protect route - just require valid token
 * app.get("/api/profile", requireAuth(config), handler);
 *
 * // Protect route - require specific scopes
 * app.get("/api/admin", requireAuth(config, ["admin:read"]), handler);
 *
 * // Access validated token in handler
 * app.get("/api/me", requireAuth(config), (req, res) => {
 *   const userId = req.accessToken!.payload.sub;
 *   res.json({ userId });
 * });
 * ```
 */
export function requireAuth(config: TokenValidationConfig, requiredScopes: string[] = []) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Extract token from Authorization header (RFC 6750 Section 2.1)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).setHeader("WWW-Authenticate", 'Bearer realm="api"').json({
        error: "invalid_request",
        error_description: "Missing or malformed Authorization header. Expected: Bearer <token>",
      });
      return;
    }

    const accessToken = authHeader.slice(7); // Remove "Bearer " prefix

    if (!accessToken) {
      res.status(401).setHeader("WWW-Authenticate", 'Bearer realm="api"').json({
        error: "invalid_request",
        error_description: "Empty access token",
      });
      return;
    }

    // Validate the token
    const validatedToken = await validateAccessToken(accessToken, config);

    if (!validatedToken) {
      // RFC 6750 Section 3.1 - WWW-Authenticate header for invalid token
      res.status(401).setHeader("WWW-Authenticate", 'Bearer realm="api", error="invalid_token"').json({
        error: "invalid_token",
        error_description: "The access token is invalid, expired, or revoked",
      });
      return;
    }

    // Check required scopes if specified
    if (requiredScopes.length > 0 && !hasRequiredScopes(validatedToken, requiredScopes)) {
      // RFC 6750 Section 3.1 - insufficient_scope error
      res
        .status(403)
        .setHeader(
          "WWW-Authenticate",
          `Bearer realm="api", error="insufficient_scope", scope="${requiredScopes.join(" ")}"`,
        )
        .json({
          error: "insufficient_scope",
          error_description: `This endpoint requires the following scopes: ${requiredScopes.join(" ")}`,
          required_scopes: requiredScopes,
          granted_scopes: validatedToken.scopes,
        });
      return;
    }

    // Attach validated token to request for use in handlers
    req.accessToken = validatedToken;
    next();
  };
}
