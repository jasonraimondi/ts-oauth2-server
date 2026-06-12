# Entity Interfaces

## Client Entity

The Client Entity represents an application that requests access to protected resources on behalf of the resource owner (user).

:::info redirect_uris:

- URIs must be absolute.
- URIs may include query parameters in application/x-www-form-urlencoded format
- URIs must not include fragment components.
- At authorization time, the requested `redirect_uri` must exactly match a registered URI — host, path, port, and query string all included ([RFC 6749 §3.1.2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2.3)). Only `http`-scheme loopback URIs (`http://127.0.0.1`, `http://[::1]`, and — unless [`treatLocalhostAsLoopback`](../authorization_server/configuration.md) is disabled — `http://localhost`) may vary the port ([RFC 8252 §7.3](https://datatracker.ietf.org/doc/html/rfc8252#section-7.3)), so register every variant you redirect to.
- The `redirect_uri` request parameter may be omitted only when the client has exactly one registered URI.

:::

```ts
interface OAuthClient {
  id: string;
  name: string;
  secret?: string;
  redirectUris: string[];
  allowedGrants: GrantIdentifier[];
  scopes: OAuthScope[];
}
```

## Auth Code Entity

The Auth Code Entity represents a short-lived authorization code used in the Authorization Code grant type. It's an intermediary step between user authorization and token issuance.

```ts
interface OAuthAuthCode {
  code: string;
  redirectUri?: string;
  codeChallenge?: string;
  codeChallengeMethod?: CodeChallengeMethod;
  expiresAt: Date;
  user?: OAuthUser;
  client: OAuthClient;
  scopes: OAuthScope[];
}

type CodeChallengeMethod = "S256" | "plain";
```

## Token Entity

The Token Entity represents access and refresh tokens issued to clients.

```ts
interface OAuthToken {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: Date | null;
  client: OAuthClient;
  user?: OAuthUser | null;
  scopes: OAuthScope[];
  originatingAuthCodeId?: string;
}
```

## User Entity

The User Entity represents the resource owner - typically the end-user who authorizes an application to access their account.

```ts
interface OAuthUser {
  id: string;
  [key: string]: any;
}
```

## Scope Entity

Scopes are used to define and limit the extent of access granted to a client application. They provide granular control over the permissions given to third-party applications.

For more information on OAuth 2.0 scopes, visit: https://www.oauth.com/oauth2-servers/scope/

```ts
interface OAuthScope {
  name: string;
  [key: string]: any;
}
```
