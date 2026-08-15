# Configuration

:::info

The default configuration is correct for most projects. You do not usually change these options.

:::

The authorization server has these optional settings:

| Option | Type | Default | Details |
| --- | --- | --- | --- |
| `requiresPKCE` | boolean | `true` | The server enforces PKCE. Disable it only for an old Client that cannot use PKCE. [[Learn more]][requires-pkce] |
| `requiresS256` | boolean | `true` | The server accepts only the `S256` challenge method. Disable it to also accept the `plain` method. [[Learn more]][requires-s256] |
| `notBeforeLeeway` | number | `0` | The permitted clock difference, as a NumericDate value. Keep it small, usually a few minutes at most. |
| `tokenCID` | `"id"` \| `"name"` | `"id"` | The source of the `cid` claim in an Access Token: the `client.id` or the `client.name`. [[Learn more]][token-cid] |
| `issuer` | string | `undefined` | The value of the `iss` claim. It becomes mandatory when you set the `oidc` block. |
| `scopeDelimiter` | string | `" "` | The character that separates the scopes in a scope string. |
| `authenticateIntrospect` | boolean | `true` | The [/token/introspect](../endpoints/introspect.md) endpoint authenticates the Client. The Client sends a valid `client_id` and `client_secret`, in the body or in the `Authorization` header. |
| `authenticateRevoke` | boolean | `true` | The [/token/revoke](../endpoints/revoke.md) endpoint authenticates the Client, in the same way. |
| `introspectionRequiresConfidentialClient` | boolean | `true` | Only a Confidential Client can introspect a token ([RFC 7662 §4](https://datatracker.ietf.org/doc/html/rfc7662#section-4)). Set it to `false` to also let a Public Client introspect. It does nothing when `authenticateIntrospect` is `false`. |
| `implicitRedirectMode` | `"query"` \| `"fragment"` | `"fragment"` | How the [implicit grant](../grants/implicit.md) adds a token to the redirect URI. [RFC 6749 §4.2.2](https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2) recommends `"fragment"`. Use `"query"` only for an old Client. |
| `logger` | LoggerService | `undefined` | A logger for the debug data, which is useful for the token operations such as a revocation. |
| `useOpaqueAuthorizationCodes` | boolean | `false` | The server returns each authorization code as a random string, and not as a signed JWT. It stores each code, and validates it with a repository. |
| `useOpaqueRefreshTokens` | boolean | `false` | The server returns each Refresh Token as a random string, and not as a signed JWT. The [/token/revoke](../endpoints/revoke.md) and [/token/introspect](../endpoints/introspect.md) endpoints read these tokens with `TokenRepository#getByRefreshToken`. |

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
  introspectionRequiresConfidentialClient: boolean;
  implicitRedirectMode: "query" | "fragment";
  logger?: LoggerService;
  useOpaqueAuthorizationCodes?: boolean;
  useOpaqueRefreshTokens?: boolean;
};
```

To set an option, pass it as the last argument:

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

## OIDC Options

To enable OIDC, set the top-level `issuer` **and** the nested `oidc` block.

The two parts are separate for a reason. The `issuer` option is older than the OIDC layer, and the OIDC layer uses it again as the Issuer. It is the `iss` claim of each Access Token and each ID Token, and also the `issuer` field of the Discovery Document. Thus it stays at the top level. Each option that is only for OIDC stays in the `oidc` block.

When you set the `oidc` block, the `issuer` option becomes mandatory, and your `JwtService` must use an RS256 key.

| Option | Type | Default | Details |
| --- | --- | --- | --- |
| `authorizationEndpoint` | string | — | The absolute URL of your `/authorize` route. The Discovery Document shows this value, because the library does not control your routes. |
| `tokenEndpoint` | string | — | The absolute URL of your `/token` route. |
| `userinfoEndpoint` | string | — | The absolute URL of your [`/userinfo`](../endpoints/userinfo.md) route. |
| `jwksUri` | string | — | The absolute URL of your JWKS route. The `metadata` option cannot change this field. |
| `getUserClaims` | `(subject: string) => OidcUserClaims \| Promise<OidcUserClaims>` | — | Required. It returns the claims of the end-user for UserInfo, for one subject. See [Hooks](../oidc/hooks.md). |
| `getIdTokenClaims` | `(ctx: OidcIdTokenClaimsContext) => Record<string, unknown> \| Promise<…>` | `undefined` | Optional. It adds your own claims to the ID Token. It cannot change a Protocol Claim. See [Hooks](../oidc/hooks.md). |
| `metadata` | `Record<string, unknown>` | `undefined` | Optional. It adds fields to the Discovery Document, for example `scopes_supported` or `claims_supported`. It cannot change `issuer`, `jwks_uri`, or `id_token_signing_alg_values_supported`. |

```ts
type OidcOptions = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  jwksUri: string;
  getUserClaims: (subject: string) => OidcUserClaims | Promise<OidcUserClaims>;
  getIdTokenClaims?: (context: OidcIdTokenClaimsContext) => Record<string, unknown> | Promise<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
};

type AuthorizationServerOptions = {
  // ...existing options...
  issuer?: string;   // mandatory when `oidc` is set — the OIDC issuer
  oidc?: OidcOptions; // enables OIDC: ID tokens, /userinfo, discovery, JWKS
};
```

[Getting Started with OIDC](../oidc/getting_started.md) gives a full example.

## Logger Configuration

The authorization server can write debug data, which helps you when you examine the token operations. Use the console logger of the library, or write your own logger.

### Use the Console Logger

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

### Write Your Own Logger

Write the `LoggerService` interface to connect the server to your own logging library:

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

### The Logged Data

The logger records:

- An error in the validation of a token
- A failed client authentication
- An attempt to revoke a token
- An error in a grant

Use this data to find a problem with a token, or with a flow, in development and in production.

[requires-pkce]: https://datatracker.ietf.org/doc/html/rfc7636
[requires-s256]: https://datatracker.ietf.org/doc/html/rfc7636#section-4.2
[token-cid]: https://github.com/jasonraimondi/ts-oauth2-server/blob/main/src/grants/abstract/abstract.grant.ts
