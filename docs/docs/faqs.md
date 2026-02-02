# FAQ's

## How do I validate access tokens in my API middleware?

There are two approaches for validating OAuth access tokens to protect your API endpoints:

### Option 1: JWT Verification + Repository Check (Recommended)

This approach combines JWT signature verification with a database check for token revocation:

```typescript
import { JwtInterface, OAuthToken, OAuthTokenRepository } from "@jmondi/oauth2-server";

interface AccessTokenPayload {
  jti: string;   // Token ID (maps to accessToken in repository)
  sub?: string;  // User ID
  cid: string;   // Client ID
  exp: number;   // Expiration timestamp
  iat: number;   // Issued at timestamp
  iss?: string;  // Issuer
  aud?: string | string[];  // Audience
  scope?: string;  // Space-delimited scopes
}

interface ValidatedToken {
  payload: AccessTokenPayload;
  scopes: string[];
  token: OAuthToken;
}

async function validateAccessToken(
  accessToken: string,
  jwtService: JwtInterface,
  tokenRepository: OAuthTokenRepository,
  expectedIssuer?: string,
  expectedAudience?: string,
): Promise<ValidatedToken | null> {
  try {
    // Step 1: Verify JWT signature and decode
    const payload = await jwtService.verify(accessToken) as AccessTokenPayload;

    // Step 2: Validate issuer (if configured)
    if (expectedIssuer && payload.iss !== expectedIssuer) {
      return null;
    }

    // Step 3: Validate audience (if configured)
    if (expectedAudience) {
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!audiences.includes(expectedAudience)) {
        return null;
      }
    }

    // Step 4: Check revocation status via repository
    if (typeof tokenRepository.getByAccessToken !== "function") {
      throw new Error("TokenRepository.getByAccessToken is required");
    }

    const storedToken = await tokenRepository.getByAccessToken(payload.jti);
    if (!storedToken) {
      return null; // Token not found (revoked or never existed)
    }

    // Step 5: Check expiration from repository (defense in depth)
    if (storedToken.accessTokenExpiresAt < new Date()) {
      return null;
    }

    return {
      payload,
      scopes: payload.scope?.split(" ") ?? [],
      token: storedToken,
    };
  } catch {
    return null; // JWT verification failed
  }
}
```

#### Express Middleware Example

```typescript
import { Request, Response, NextFunction } from "express";

function requireAuth(requiredScopes: string[] = []) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "invalid_request" });
    }

    const token = authHeader.slice(7);
    const validated = await validateAccessToken(
      token,
      jwtService,
      tokenRepository
    );

    if (!validated) {
      return res.status(401)
        .setHeader("WWW-Authenticate", 'Bearer error="invalid_token"')
        .json({ error: "invalid_token" });
    }

    // Check scopes
    const hasScopes = requiredScopes.every(s => validated.scopes.includes(s));
    if (!hasScopes) {
      return res.status(403).json({ error: "insufficient_scope" });
    }

    req.accessToken = validated;
    next();
  };
}

// Usage
app.get("/api/profile", requireAuth(), handler);
app.get("/api/admin", requireAuth(["admin:read"]), adminHandler);
```

### Option 2: Use the Introspection Endpoint

The library provides an `/introspect` endpoint ([RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662)) that handles validation. This is ideal when:

- Your resource server is separate from the authorization server
- You need RFC 7662 compliance
- You don't have direct access to the JWT secret

See the [Introspect Endpoint documentation](/docs/endpoints/introspect) for details.

### Why isn't there a built-in `verifyToken()` method?

The OAuth 2.0 specification intentionally leaves token validation up to individual implementations because different applications have different requirements:

- **Scope checking**: Which scopes are required for which endpoints?
- **Audience validation**: Is this token meant for your API?
- **Custom business logic**: User-specific restrictions, rate limiting, etc.
- **Performance trade-offs**: Cache tokens? Skip DB checks for short-lived tokens?

The library provides the building blocks (`JwtService.verify()`, `TokenRepository.getByAccessToken()`), and you compose them based on your security requirements.

For a complete working example, see the [example project](https://github.com/jasonraimondi/ts-oauth2-server/tree/main/example) and the [Protecting Resources guide](/docs/getting_started/protecting_resources).

## Common Errors

### `Unsupported grant_type`

Check if you're enabling the desired grant type on the AuthorizationServer. See https://tsoauth2server.com/docs/authorization_server/#enabling-grant-types for more.

```typescript
import {AuthorizationServer} from "@jmondi/oauth2-server";

const authorizationServer = new AuthorizationServer(...);
authorizationServer.enableGrantType({ grant: "password" ... });
```

### `Client has been revoked or is invalid`

Check the `OAuthClientRepository#isClientValid` method, it is returning **false**.
