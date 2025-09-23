# FAQ's

## Why isn't there a built-in `verifyToken()` method?

The OAuth 2.0 specification intentionally leaves token validation up to individual implementations because different applications have different requirements for:

- Scope checking
- Audience validation
- Custom business logic
- Performance considerations

## Do I need both JWT verification AND repository checking?

Yes, both are recommended for comprehensive security! Each serves a different purpose:

- **JWT verification** handles signature validation and prevents token tampering
- **Repository checking** handles token revocation and ensures the token hasn't been invalidated

This dual approach provides comprehensive security for your OAuth implementation.

## How do I validate OAuth access tokens in my application?

There are two main methods for validating OAuth access tokens:

### Option 1: JWT + Repository Check

This approach combines JWT signature verification with a database check for token revocation:

```typescript
async function validateToken(accessToken: string) {
  // Verify JWT signature and decode
  const decoded = await jwtService.verify(accessToken);
  
  // Check if token exists and isn't revoked
  const storedToken = await accessTokenRepository.getByAccessToken(accessToken);
  
  return storedToken && !isExpired(storedToken) ? { valid: true, decoded, storedToken } : { valid: false };
}
```

### Option 2: Use the Introspection Endpoint

The OAuth library provides an `/introspect` endpoint (RFC 7662) that handles validation for you. You can either:

- Expose it and call it from your middleware
- Use the same logic internally by calling `authorizationServer.introspect()` directly

This method handles both JWT verification and token status checking automatically.

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
