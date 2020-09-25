import { DateInterval } from "@jmondi/date-interval";

import {
  OAuthAccessTokenRepository,
  OAuthAuthCodeRepository,
  OAuthClientRepository,
  OAuthRefreshTokenRepository,
  OAuthScopeRepository,
  OAuthUserRepository,
} from "../../src/repositories";
import {
  OAuthAccessToken,
  OAuthAuthCode,
  OAuthClient,
  OAuthRefreshToken,
  OAuthScope,
  OAuthUser,
} from "../../src/entities";
import { GrantTypeIdentifiers } from "../../src/grants";
import { inMemoryDatabase } from "./database";

const oneHourInFuture = new DateInterval({ hours: 1 }).end();

export const inMemoryClientRepository: OAuthClientRepository = {
  async getClientByIdentifier(clientId: string): Promise<OAuthClient> {
    return inMemoryDatabase.clients.find((client) => client.id === clientId)!;
  },

  async isClientValid(grantType: GrantTypeIdentifiers, clientId: string, clientSecret?: string): Promise<boolean> {
    const client = await this.getClientByIdentifier(clientId);
    return true;
  },
};

export const inMemoryScopeRepository: OAuthScopeRepository = {
  async getScopesByIdentifier(scopeNames: string[]): Promise<OAuthScope[]> {
    return inMemoryDatabase.scopes.filter((scope) => scopeNames.includes(scope.name));
  },
  async finalizeScopes(
    scopes: OAuthScope[],
    identifier: GrantTypeIdentifiers,
    client: OAuthClient,
    user_id?: string,
  ): Promise<OAuthScope[]> {
    return scopes;
  },
};

export const inMemoryAccessTokenRepository: OAuthAccessTokenRepository = {
  async getNewToken(client: OAuthClient, scopes: OAuthScope[], userId: string | undefined): Promise<OAuthAccessToken> {
    return {
      toJWT: {},
      token: "new token",
      client,
      clientId: client.id,
      userId: userId,
      expiresAt: oneHourInFuture,
    } as OAuthAccessToken;
  },
  async persistNewAccessToken(accessToken: OAuthAccessToken): Promise<void> {
    inMemoryDatabase.accessTokens.push(accessToken);
  },
};

export const inMemoryRefreshTokenRepository: OAuthRefreshTokenRepository = {
  async getNewToken(accessToken: OAuthAccessToken): Promise<OAuthRefreshToken | undefined> {
    return {
      refreshToken: "this-is-my-super-secret-refresh-token",
      accessToken,
      expiresAt: oneHourInFuture,
      accessTokenToken: accessToken.token,
    } as OAuthRefreshToken;
  },
  async persistNewRefreshToken(refreshToken: OAuthRefreshToken): Promise<void> {
    inMemoryDatabase.refreshTokens.push(refreshToken);
  },
};

export const inMemoryAuthCodeRepository: OAuthAuthCodeRepository = {
  getNewAuthCode(client: OAuthClient, user: OAuthUser | undefined, scopes: OAuthScope[]): OAuthAuthCode {
    return {
      token: "my-super-secret-auth-code",
      user,
      userId: user?.id,
      client,
      clientId: client.id,
      redirectUri: "",
      codeChallenge: undefined,
      codeChallengeMethod: undefined,
      expiresAt: oneHourInFuture,
      scopes: [],
    };
  },
  async persistNewAuthCode(authCode: OAuthAuthCode): Promise<void> {
    inMemoryDatabase.authCodes.push(authCode);
  },
  async isAuthCodeRevoked(authCodeCode: string): Promise<boolean> {
    const authCode = await this.getAuthCodeByIdentifier(authCodeCode);
    return Date.now() > authCode.expiresAt.getTime();
  },
  async getAuthCodeByIdentifier(authCodeCode: string): Promise<OAuthAuthCode> {
    return inMemoryDatabase.authCodes.find((code) => code.token === authCodeCode)!;
  },
  async revokeAuthCode(authCodeCode: string): Promise<void> {
    inMemoryDatabase.authCodes = inMemoryDatabase.authCodes.filter((code) => code.token !== authCodeCode);
  },
};

export const inMemoryUserRepository: OAuthUserRepository = {
  async getByUserIdentifier(userIdentifier: string): Promise<OAuthUser> {
    return inMemoryDatabase.users.find((user) => user.identifier === userIdentifier)!;
  },
};
