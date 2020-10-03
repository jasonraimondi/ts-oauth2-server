---
title: Repository Interfaces
---

# {{ $frontmatter.title }}

## Auth Code Repository

```typescript
interface OAuthAuthCodeRepository {
  getByIdentifier(authCodeCode: string): Promise<OAuthAuthCode>;

  issueAuthCode(
    client: OAuthClient, 
    user: OAuthUser | undefined, 
    scopes: OAuthScope[]
  ): OAuthAuthCode;

  persist(authCode: OAuthAuthCode): Promise<void>;

  isRevoked(authCodeCode: string): Promise<boolean>;

  revoke(authCodeCode: string): Promise<void>;
}
```

## Client Repository

```typescript
interface OAuthClientRepository {
  getByIdentifier(clientId: string): Promise<OAuthClient>;

  isClientValid(
    grantType: GrantIdentifier, 
    client: OAuthClient, 
    clientSecret?: string
  ): Promise<boolean>;
}
```

## Scope Repository

```typescript
interface OAuthScopeRepository {
  // Find all scopes by scope names
  getAllByIdentifiers(scopeNames: string[]): Promise<OAuthScope[]>;

  // Scopes have already been validated against the client, if you arent 
  // doing anything fancy with scopes, you can just `return scopes`,
  // Otherwise, now is your chance to add or remove any final scopes 
  // after they have already been validated against the client scopes
  finalize(
    scopes: OAuthScope[],
    identifier: GrantIdentifier,
    client: OAuthClient,
    user_id?: string,
  ): Promise<OAuthScope[]>;
}
```

## Token Repository

```typescript
interface OAuthTokenRepository {
  // An async call that should return an OAuthToken that has not been 
  // persisted to storage yet.
  issueToken(
    client: OAuthClient, 
    scopes: OAuthScope[], 
    user?: OAuthUser
  ): Promise<OAuthToken>;

  // @todo this method probably shouldnt exist like this
  issueRefreshToken(): Promise<[string, Date]>;

  // An async call that should persist an OAuthToken into your storage. 
  persist(accessToken: OAuthToken): Promise<void>;

  // This async method is called when a refresh token is used to reissue 
  // an access token. The original access token is revoked a new access 
  // token is issued.
  revoke(accessTokenToken: OAuthToken): Promise<void>;

  // This async method is called when an access token is validated by the 
  // authorization server. Return `true` if the access token has been 
  // manually revoked. If the token is still valid return `false`
  isRefreshTokenRevoked(refreshToken: OAuthToken): Promise<boolean>;

  // This async method is called
  getByRefreshToken(refreshTokenToken: string): Promise<OAuthToken>;
}
```

## User Repository

```typescript
interface OAuthUserRepository {
  getUserByCredentials(
    identifier: string,
    password?: string,
    grantType?: GrantIdentifier,
    client?: OAuthClient,
  ): Promise<OAuthUser | undefined>;
}
```
