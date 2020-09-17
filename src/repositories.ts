export interface IClient {
  id: string;
  name: string;
  redirectUri: string | string[];
  isConfidential: boolean;
}

export interface IAccessToken {
  id: string;
  expiresAt: Date;
  user: IUser;
  client: IClient;
  scopes: IScope;
}

export interface IRefreshToken {
  id: string;
  expiresAt: Date;
}

export interface IScope {
  id: string;
}

export interface IUser {
  id: string;
}

export interface IAuthCode {
  redirectUri: string;
}

export interface IAccessTokenRepository {
  getNewToken(client: IClient, scopes: IScope[], userId?: string): any;

  persistNewAccessToken(accessToken: IAccessToken): any;

  revokeAccessToken(token: string): any;

  isAccessTokenRevoked(token: string): any;
}

export interface IAuthCodeRepository {
  getNewAuthCode(): IAuthCode;

  persistNewAuthCode(authCode: IAuthCode): void;

  revokeAuthCode(code: string): void | Promise<void>;

  isAuthCodeRevoked(code: string): boolean | Promise<boolean>;
}

export interface IClientRepository {
  getClientEntity(clientId: string): Promise<IClient>;

  validateClient(clientId: string, clientSecret?: string, grantType?: string): boolean | Promise<boolean>
}

export interface IRefreshTokenRepository {
  getNewRefreshToken(): IRefreshToken | Promise<IRefreshToken>;

  persistNewRefreshToken(refreshToken: IRefreshToken): void | Promise<void>;

  revokeRefreshToken(token: string): void | Promise<void>;

  isRefreshTokenRevoked(token: string): boolean | Promise<boolean>;
}

export interface IScopeRepository {
  getScopeEntityByIdentifier($identifier: string): IScope | Promise<IScope>;

  finalizeScopes(scopes: IScope, grantType: string, client: IClient, userIdentifier: string): IScope | Promise<IScope>
}

export interface IUserRepositoryInterface {
  getUserEntityByUserCredentials(
    identifier: string,
    password: string,
    grantType: string,
    client: IClient,
  ): IUser;
}
