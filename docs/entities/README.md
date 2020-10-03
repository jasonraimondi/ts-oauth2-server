---
title: Entity Interfaces
---

# {{ $frontmatter.title }}


## Client Entity

This entity represents the client that wants to access the resource server. The client will retrieve an access token from our authorization server and use it to access the resource server.

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
  codeChallengeMethod?: string;
  expiresAt: Date;
  user?: OAuthUser;
  client: OAuthClient;
  scopes: OAuthScope[];
}
```

## Token Entity

The access and refresh token that can be used to authenticate into the resource server.

```typescript
interface OAuthToken {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  client: OAuthClient;
  user?: OAuthUser;
  scopes: OAuthScope[];
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