# Configuration

:::info

The default configuration is great for most users. You might not need to tweak anything here.

:::

The authorization server has a few optional settings with the following default values;

| Option                   | Type                | Default   | Details                                                                                                                                                                                                                                                                                  |
| ------------------------ | ------------------- | --------- |------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `requiresPKCE`           | boolean             | true      | PKCE is enabled by default and recommended for all users. To support a legacy client without PKCE, disable this option. [[Learn more]][requires-pkce]                                                                                                                                    |
| `requiresS256`           | boolean             | true      | S256 PKCE is required by default. To allow clients to use the `plain` PKCE challenge method, disable this option. [[Learn more]][requires-s256]                                                                                                                                          |
| `notBeforeLeeway`        | number              | 0         | Implementers MAY provide for some small leeway, usually no more than a few minutes, to account for clock skew. Its value MUST be a number containing a NumericDate value.                                                                                                                |
| `tokenCID`               | "id" or "name"      | "id"      | Sets the JWT `accessToken.cid` to either the `client.id` or `client.name`. [[Learn more]][token-cid]                                                                                                                                                                                     |
| `issuer`                 | string \| undefined | undefined | Sets the JWT `accessToken.iss` to this value.                                                                                                                                                                                                                                            |
| `scopeDelimiter`         | string              | " "       | Sets the delimiter used to join and split OAuth scope strings.                                                                                                                                                                                                                           |
| `authenticateIntrospect` | boolean             | true      | Authorize the [/introspect](../endpoints/introspect.md) endpoint using `client_credentials`, this requires users to pass in a valid client_id and client_secret (or Authorization header)                                                                                                |
| `authenticateRevoke`     | boolean             | true      | Authorize the [/revoke](../endpoints/revoke.md) endpoint using `client_credentials`, this requires users to pass in a valid client_id and client_secret (or Authorization header).                                                                                                       |
| `logger`                 | LoggerService \| undefined | undefined | Optional logger service to capture debugging information, particularly useful for tracking token operations like revocations.                                                                                                                                                            |
| `useOpaqueAuthorizationCodes` | boolean        | false     | When enabled, authorization codes are returned as simple random strings rather than signed JWTs. This provides flexibility for different security models while maintaining full OAuth 2.0 compliance. Opaque codes are stored server-side and validated through repository lookups.      |
| `useOpaqueRefreshTokens` | boolean        | false     | When enabled, refresh tokens are returned as simple random strings rather than signed JWTs. This provides flexibility for different security models while maintaining full OAuth 2.0 compliance. Opaque refresh tokens are stored server-side and validated through repository lookups.  |
| `implicitRedirectMode`   | "query" \| "fragment" | "fragment" | Controls how the [implicit grant](../grants/implicit.md) appends tokens to the redirect URI. OAuth 2.0 ([RFC 6749 §4.2.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2)) recommends `"fragment"`. Set `"query"` only for legacy clients that depend on the previous behavior. |

```ts
type AuthorizationServerOptions = {
  notBeforeLeeway: number;
  requiresPKCE: boolean;
  requiresS256: boolean;
  tokenCID: "id" | "name";
  issuer?: string;
  scopeDelimiter: string;
  authenticateIntrospect: boolean;
  authenticateRevoke: boolean;
  implicitRedirectMode: "query" | "fragment";
  logger?: LoggerService;
  useOpaqueAuthorizationCodes?: boolean;
  useOpaqueRefreshTokens?: boolean;
};
```

To configure these options, pass the value in as the last argument:

```ts
const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  new JwtService("secret-key"),
  {
    issuer: "auth.example.com",
  },
);
```

## Logger Configuration

The authorization server supports optional logging for debugging purposes, particularly useful for tracking token operations. You can provide either a custom logger implementation or use the built-in console logger.

### Using the Built-in Console Logger

```ts
import { ConsoleLoggerService } from "@jmondi/oauth2-server";

const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  new JwtService("secret-key"),
  {
    logger: new ConsoleLoggerService(),
  },
);
```

### Custom Logger Implementation

Implement the `LoggerService` interface to integrate with your preferred logging library:

```ts
import { LoggerService } from "@jmondi/oauth2-server";

class MyCustomLogger implements LoggerService {
  log(message?: any, ...optionalParams: any[]): void {
    // Integration with your logging library (Winston, Pino, etc.)
    console.log('[OAuth2]', message, ...optionalParams);
  }
}

const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  new JwtService("secret-key"),
  {
    logger: new MyCustomLogger(),
  },
);
```

### What Gets Logged

The logger captures debugging information including:
- Token validation errors
- Client authentication failures
- Token revocation attempts
- General grant processing errors

This is particularly useful for debugging token-related operations and understanding OAuth flow issues in development and production environments.

[requires-pkce]: https://datatracker.ietf.org/doc/html/rfc7636
[requires-s256]: https://datatracker.ietf.org/doc/html/rfc7636#section-4.2
[token-cid]: https://github.com/jasonraimondi/ts-oauth2-server/blob/main/src/grants/abstract/abstract.grant.ts
