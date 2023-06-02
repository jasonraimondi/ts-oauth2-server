# Repository Interfaces

## Auth Code Repository

```typescript
interface OAuthAuthCodeRepository {

  // Fetch auth code entity from storage by code
  getByIdentifier(authCodeCode: string): Promise<OAuthAuthCode>;

  // An async call that should return an OAuthAuthCode that has not been 
  // persisted to storage yet.
  issueAuthCode(
    client: OAuthClient, 
    user: OAuthUser | undefined, 
    scopes: OAuthScope[]
  ): OAuthAuthCode | Promise<OAuthAuthCode>;

  // An async call that should persist an OAuthAuthCode into your storage.
  persist(authCode: OAuthAuthCode): Promise<void>;

  // This async method is called when an auth code is validated by the 
  // authorization server. Return `true` if the auth code has been 
  // manually revoked. If the code is still valid return `false`
  isRevoked(authCodeCode: string): Promise<boolean>;

  revoke(authCodeCode: string): Promise<void>;
}
```

## Client Repository

```typescript
interface OAuthClientRepository {
  // Fetch client entity from storage by client_id
  getByIdentifier(clientId: string): Promise<OAuthClient>;

  // check the grant type and secret against the client
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

  // An async call that should persist an OAuthToken into your storage.
  persist(accessToken: OAuthToken): Promise<void>;

  // An async call that enhances an already-persisted OAuthToken with
  // refresh token fields.
  issueRefreshToken(
    accessToken: OAuthToken,
    client: OAuthClient,
  ): Promise<OAuthToken>

  // This async method is called when a refresh token is used to reissue 
  // an access token. The original access token is revoked, and a new
  // access token is issued.
  revoke(accessToken: OAuthToken): Promise<void>;

  // This async method, if implemented, will be called by the authorization
  // code grant if the original authorization code is reused.
  // See https://www.rfc-editor.org/rfc/rfc6749#section-4.1.2 for why.
  revokeDescendantsOf?(authCodeId: string): Promise<void>;

  // This async method is called when an access token is validated by the 
  // authorization server. Return `true` if the access token has been 
  // manually revoked. If the token is still valid return `false`
  isRefreshTokenRevoked(refreshToken: OAuthToken): Promise<boolean>;

  // Fetch refresh token entity from storage by refresh token
  getByRefreshToken(refreshTokenToken: string): Promise<OAuthToken>;
}
```

## User Repository

```typescript
interface OAuthUserRepository {

  // Fetch user entity from storage by identifier. A provided password may 
  // be used to validate the users credentials. Grant type and client are provided
  // for additional checks if desired
  getUserByCredentials(
    identifier: string,
    password?: string,
    grantType?: GrantIdentifier,
    client?: OAuthClient,
  ): Promise<OAuthUser | undefined>;

  // Optionally you can add extra claims to access token
  extraAccessTokenFields?(user: OAuthUser): Promise<ExtraAccessTokenFields | undefined>;
  
}
```
