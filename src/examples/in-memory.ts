import {
  IAccessToken,
  IAccessTokenRepository,
  IAuthCode,
  IAuthCodeRepository,
  IClient,
  IClientRepository,
  IRefreshToken,
  IRefreshTokenRepository,
  IScope,
  IScopeRepository,
} from "../repositories";

export const inMemoryDatabase = {
  clients: [
    {
      id: "abc123",
      name: "testing client",
      redirectUri: "http://localhost",
      isConfidential: false,
    },
  ],
  authCodes: [],
  accessTokens: [],
  refreshTokens: [],
  scopes: [],
};

export const inMemoryClientRepository: IClientRepository = {
  getClientEntity(clientId: string): IClient {
    return inMemoryDatabase.clients.filter(client => client.id === clientId)[0];
  },
  validateClient(clientId: string, clientSecret?: string, grantType?: string): boolean {
    console.log({ clientId, clientSecret, grantType });
    return true;
  },
};

export const inMemoryScopeRepository: IScopeRepository = {
  finalizeScopes(scopes: IScope, grantType: string, client: IClient, userIdentifier: string) {
    console.log({ scopes, grantType, client, userIdentifier });
    return scopes;
  },
  getScopeEntityByIdentifier(scopeId: string): IScope {
    return { id: scopeId };
  },
};

export const inMemoryAccessTokenRepository: IAccessTokenRepository = {
  getNewToken(client: IClient, scopes: IScope[], userId?: string): any {
    console.log({ client, scopes, userId });
    return;
  },
  isAccessTokenRevoked(token: string): any {
    console.log({ token });
    return false;
  },
  persistNewAccessToken(accessToken: IAccessToken): any {
    console.log({ accessToken });
    return;
  },
  revokeAccessToken(token: string): any {
    console.log({ token });
    return;
  },
};

export const inMemoryRefreshTokenRepository: IRefreshTokenRepository = {
  getNewRefreshToken(): IRefreshToken | Promise<IRefreshToken> {
    return {
      id: "abc123-refresh-token",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2),
    };
  },
  isRefreshTokenRevoked(token: string): boolean | Promise<boolean> {
    console.log({ token });
    return false;
  },
  persistNewRefreshToken(refreshToken: IRefreshToken): void | Promise<void> {
    console.log({ refreshToken });
  },
  revokeRefreshToken(token: string): void | Promise<void> {
    console.log({ token });
  },
};

export const inMemoryAuthCodeRepository: IAuthCodeRepository = {
  getNewAuthCode(): IAuthCode {
    return { redirectUri: "http://localhost " };
  },
  isAuthCodeRevoked(code: string): boolean | Promise<boolean> {
    console.log({ code });
    return false;
  },
  persistNewAuthCode(authCode: IAuthCode): void {
    console.log({ authCode });
  },
  revokeAuthCode(code: string): void | Promise<void> {
    console.log({ code });
  },
};
