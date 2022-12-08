---
title: Entity Interfaces
---

# Entity Interfaces

## Client Entity

This entity represents the client that wants to access the resource server. The client will retrieve an access token from our authorization server and use it to access the resource server.

// document what a good redirectUrl is

* URI must be an absolute URI
* The endpoint may include application/x-www-form-urlencoded formatted query component which must be retained when adding additional query params
    * // @todo verify this second point, I know we can append urls, but we need to encode/decode the redirectUri
* the endpoint URI must not include a fragment component

```typescript
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

The auth code is used to retrieve an access token from the authorization server.

```typescript
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
```

::: tip

```ts
type CodeChallengeMethod = "S256" | "plain";
```
:::

## Token Entity

The access and refresh token that can be used to authenticate into the resource server.
The `originatingAuthCodeId` will be present only for tokens originating from the authorization code grant; see the `revokeDescendantsOf()` method on the [Token Repository](https://jasonraimondi.github.io/ts-oauth2-server/repositories/#token-repository) for its significance.

```typescript
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

The resource owner

```typescript
interface OAuthUser {
  id: string;
  [key: string]: any;
}
```

## Scope Entity

Scopes are a way to limit an app’s access to a user’s data.

https://www.oauth.com/oauth2-servers/scope/

```typescript
interface OAuthScope {
  name: string;
  [key: string]: any;
}
```