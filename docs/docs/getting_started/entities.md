# Entity Interfaces

## Client Entity

The Client entity is an application that requests access to protected resources for the resource owner, who is the user.

:::info redirect_uris

- Each URI must be absolute.
- A URI can contain query parameters in `application/x-www-form-urlencoded` format.
- A URI must not contain a fragment.
- The server compares the requested `redirect_uri` against each Registered Redirect URI, and the two must be the same URI ([RFC 6749 §3.1.2.3](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2.3)). The host, the path, the port, and the query string must all agree.
- One exception applies. A Loopback Redirect URI can use a different port. This is an `http` URI with the host `localhost`, `127.0.0.1`, or `[::1]` ([RFC 8252 §7.3](https://datatracker.ietf.org/doc/html/rfc8252#section-7.3)). Thus you must register each URI that your Client uses.
- You can omit the `redirect_uri` parameter only when the Client has one Registered Redirect URI.

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

The Auth Code entity is an authorization code with a short life. The authorization code grant uses it as the step between the authorization by the user and the issue of the token.

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
  nonce?: string | null;
  authTime?: number | null;
  maxAge?: number | null;
}

type CodeChallengeMethod = "S256" | "plain";
```

:::info OpenID Connect

The last three fields hold the OIDC data from the authorization request. With an [opaque authorization code](/docs/authorization_server/configuration), the stored row is the only record of them. Your repository must persist `nonce` and `authTime`, or the server rejects the code with `invalid_grant`.

:::

## Token Entity

The Token entity holds an Access Token, and the Refresh Token that goes with it.

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

The User entity is the resource owner. This is usually the end-user who lets an application use their account.

```ts
interface OAuthUser {
  id: string;
  [key: string]: any;
}
```

## Scope Entity

A scope limits the access that the server grants to a Client. Use scopes to control the permissions of each third-party application.

For more data about OAuth 2.0 scopes, read [oauth.com](https://www.oauth.com/oauth2-servers/scope/).

```ts
interface OAuthScope {
  name: string;
  [key: string]: any;
}
```
