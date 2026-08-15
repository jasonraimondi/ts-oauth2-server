---
title: Protect Resources
---


# Protect Resources with an Access Token

This guide shows you how to validate an Access Token in your API middleware. The guide assumes that your authorization server already issues tokens.

Your middleware must make six checks: the signature, the expiry, the Issuer, the audience, the revocation state, and the scopes.

If your resource server is a different service, call the [introspection endpoint](/docs/endpoints/introspect) in place of these steps. See [Alternative: Token Introspection](#alternative-token-introspection).

## Token Payload Structure

Each Access Token is a JWT with these claims:

```typescript
interface AccessTokenPayload {
  /** Token ID - use this to look up the token in your repository */
  jti: string;
  /** Subject - typically the user ID (if user-based grant) */
  sub?: string;
  /** Client ID */
  cid: string;
  /** Expiration timestamp (Unix seconds) */
  exp: number;
  /** Issued at timestamp (Unix seconds) */
  iat: number;
  /** Not before timestamp (Unix seconds) */
  nbf?: number;
  /** Issuer - your authorization server URL */
  iss?: string;
  /** Audience - the intended recipient API */
  aud?: string | string[];
  /** Space-delimited list of granted scopes */
  scope?: string;
  // Plus any custom fields from extraTokenFields()
}
```

:::info Important
Use the `jti` claim to find the token in your `OAuthTokenRepository`. The `jti` claim holds the internal token identifier. It is **not** the JWT string that the client sent.
:::

## Implementation

### Step 1: Implement `getByAccessToken` in Your Repository

Your `OAuthTokenRepository` must implement the `getByAccessToken` method:

```typescript
class TokenRepository implements OAuthTokenRepository {
  // ... other methods ...

  async getByAccessToken(accessToken: string): Promise<OAuthToken> {
    // accessToken is the jti claim value, not the JWT
    const token = await this.db.tokens.findUnique({
      where: { accessToken },
      include: { client: true, user: true, scopes: true },
    });

    if (!token) {
      throw new Error("Token not found");
    }

    return token;
  }
}
```

### Step 2: Create the Validation Function

This function uses the `AccessTokenPayload` interface from the previous section.

```typescript
import { JwtInterface, OAuthToken, OAuthTokenRepository } from "@jmondi/oauth2-server";

interface ValidatedToken {
  payload: AccessTokenPayload;
  scopes: string[];
  token: OAuthToken;
}

interface TokenValidationConfig {
  jwtService: JwtInterface;
  tokenRepository: OAuthTokenRepository;
  expectedIssuer?: string;
  expectedAudience?: string;
}

async function validateAccessToken(
  accessToken: string,
  config: TokenValidationConfig,
): Promise<ValidatedToken | null> {
  try {
    // 1. Verify JWT signature and check exp/nbf/iat claims
    const payload = await config.jwtService.verify(accessToken) as AccessTokenPayload;

    // 2. Validate issuer (RFC 7519 Section 4.1.1)
    if (config.expectedIssuer && payload.iss !== config.expectedIssuer) {
      console.warn("Token issuer mismatch");
      return null;
    }

    // 3. Validate audience (RFC 7519 Section 4.1.3)
    if (config.expectedAudience) {
      const audiences = Array.isArray(payload.aud)
        ? payload.aud
        : payload.aud ? [payload.aud] : [];
      if (!audiences.includes(config.expectedAudience)) {
        console.warn("Token audience mismatch");
        return null;
      }
    }

    // 4. Check revocation status
    if (typeof config.tokenRepository.getByAccessToken !== "function") {
      throw new Error("TokenRepository.getByAccessToken is required");
    }

    let storedToken: OAuthToken;
    try {
      storedToken = await config.tokenRepository.getByAccessToken(payload.jti);
    } catch {
      console.warn("Token not found in repository");
      return null;
    }

    // 5. Verify expiration from database (defense in depth)
    if (storedToken.accessTokenExpiresAt < new Date()) {
      console.warn("Token expired");
      return null;
    }

    return {
      payload,
      scopes: payload.scope?.split(" ").filter(Boolean) ?? [],
      token: storedToken,
    };
  } catch (error) {
    console.warn("Token validation failed:", error);
    return null;
  }
}
```

### Step 3: Create the Middleware

::: code-group

```typescript [Express]
import { Request, Response, NextFunction } from "express";

// Extend Express types
declare global {
  namespace Express {
    interface Request {
      accessToken?: ValidatedToken;
    }
  }
}

function requireAuth(config: TokenValidationConfig, requiredScopes: string[] = []) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Extract Bearer token (RFC 6750 Section 2.1)
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401)
        .setHeader("WWW-Authenticate", 'Bearer realm="api"')
        .json({
          error: "invalid_request",
          error_description: "Missing Authorization header",
        });
      return;
    }

    const token = authHeader.slice(7);
    const validated = await validateAccessToken(token, config);

    if (!validated) {
      res.status(401)
        .setHeader("WWW-Authenticate", 'Bearer error="invalid_token"')
        .json({
          error: "invalid_token",
          error_description: "Token is invalid, expired, or revoked",
        });
      return;
    }

    // Check required scopes
    if (requiredScopes.length > 0) {
      const hasScopes = requiredScopes.every(s => validated.scopes.includes(s));
      if (!hasScopes) {
        res.status(403)
          .setHeader(
            "WWW-Authenticate",
            `Bearer error="insufficient_scope", scope="${requiredScopes.join(" ")}"`
          )
          .json({
            error: "insufficient_scope",
            error_description: `Required scopes: ${requiredScopes.join(" ")}`,
          });
        return;
      }
    }

    req.accessToken = validated;
    next();
  };
}
```

```typescript [Fastify]
import { FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    accessToken?: ValidatedToken;
  }
}

function requireAuth(config: TokenValidationConfig, requiredScopes: string[] = []) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      reply.status(401)
        .header("WWW-Authenticate", 'Bearer realm="api"')
        .send({ error: "invalid_request" });
      return;
    }

    const token = authHeader.slice(7);
    const validated = await validateAccessToken(token, config);

    if (!validated) {
      reply.status(401)
        .header("WWW-Authenticate", 'Bearer error="invalid_token"')
        .send({ error: "invalid_token" });
      return;
    }

    if (requiredScopes.length > 0) {
      const hasScopes = requiredScopes.every(s => validated.scopes.includes(s));
      if (!hasScopes) {
        reply.status(403)
          .header("WWW-Authenticate", `Bearer error="insufficient_scope"`)
          .send({ error: "insufficient_scope" });
        return;
      }
    }

    request.accessToken = validated;
  };
}
```

:::

### Step 4: Protect Your Routes

```typescript
const authConfig: TokenValidationConfig = {
  jwtService,
  tokenRepository,
  expectedIssuer: "https://auth.example.com",
  expectedAudience: "https://api.example.com",
};

// Require valid token only
app.get("/api/profile", requireAuth(authConfig), (req, res) => {
  const userId = req.accessToken!.payload.sub;
  res.json({ userId });
});

// Require specific scope
app.get("/api/admin", requireAuth(authConfig, ["admin:read"]), (req, res) => {
  res.json({ admin: true });
});

// Require multiple scopes
app.delete(
  "/api/users/:id",
  requireAuth(authConfig, ["admin:read", "admin:write"]),
  (req, res) => {
    res.json({ deleted: req.params.id });
  }
);
```

## Security Considerations

**Always set `expectedIssuer` and `expectedAudience`** when your server writes the `iss` and `aud` claims. If you do not set them, your API accepts a token from a different Issuer, or a token that is intended for a different API.

**Always read the repository. Do not trust the JWT alone.** Your server can revoke a token before the token expires, for example at logout or after a password change. Only the stored record shows this.

**Keep the life of each Access Token short.** Let the client use a Refresh Token to get a new one.

```typescript
authorizationServer.enableGrantTypes(
  ["client_credentials", new DateInterval("15m")],
  ["refresh_token", new DateInterval("7d")],
);
```

## Alternative: Token Introspection

Call the [introspection endpoint](/docs/endpoints/introspect) when your resource server is a different service, or when you must obey RFC 7662. The resource server sends the token to the authorization server, and does not verify the token itself.

```typescript
// The resource server calls the authorization server
const response = await fetch("https://auth.example.com/token/introspect", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
  },
  body: `token=${accessToken}`,
});

const { active, scope, client_id, sub } = await response.json();
```

## Complete Example

The [example project](https://github.com/jasonraimondi/ts-oauth2-server/tree/main/example) contains a full implementation in `src/middleware/auth.ts`, `src/main.ts`, and `src/repositories/token_repository.ts`.

## Test Checklist

Your middleware must refuse each of these requests:

- A request with no `Authorization` header, or with a malformed one
- A request with an expired token
- A request with an incorrect signature
- A request with a revoked token
- A request with an incorrect `iss` or `aud` claim
- A request with too few scopes

Your middleware must accept a valid token that carries the required scopes.
