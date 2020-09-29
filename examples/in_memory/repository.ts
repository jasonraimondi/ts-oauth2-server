import { DateInterval } from "~/authorization_server";
import { OAuthAccessToken } from "~/entities/access_token.entity";
import { OAuthAuthCode } from "~/entities/auth_code.entity";
import { OAuthClient } from "~/entities/client.entity";
import { OAuthRefreshToken } from "~/entities/refresh_token.entity";
import { OAuthScope } from "~/entities/scope.entity";
import { OAuthUser } from "~/entities/user.entity";
import { GrantIdentifier } from "~/grants/grant.interface";
import { OAuthAccessTokenRepository } from "~/repositories/access_token.repository";
import { OAuthAuthCodeRepository } from "~/repositories/auth_code.repository";
import { OAuthClientRepository } from "~/repositories/client.repository";
import { OAuthRefreshTokenRepository } from "~/repositories/refresh_token.repository";
import { OAuthScopeRepository } from "~/repositories/scope.repository";
import { OAuthUserRepository } from "~/repositories/user.repository";
import { inMemoryDatabase } from "./database";

const oneHourInFuture = new DateInterval("1h").getEndDate();

export const inMemoryClientRepository: OAuthClientRepository = {
  async getClientByIdentifier(clientId: string): Promise<OAuthClient> {
    return inMemoryDatabase.clients[clientId];
  },

  async isClientValid(grantType: GrantIdentifier, client: OAuthClient, clientSecret?: string): Promise<boolean> {
    if (client.secret !== clientSecret) {
      return false;
    }

    if (!client.allowedGrants.includes(grantType)) {
      return false;
    }

    return true;
  },
};

export const inMemoryScopeRepository: OAuthScopeRepository = {
  async getScopesByIdentifier(scopeNames: string[]): Promise<OAuthScope[]> {
    return Object.values(inMemoryDatabase.scopes).filter((scope) => scopeNames.includes(scope.name));
  },
  async finalizeScopes(
    scopes: OAuthScope[],
    identifier: GrantIdentifier,
    client: OAuthClient,
    user_id?: string,
  ): Promise<OAuthScope[]> {
    return scopes;
  },
};

export const inMemoryAccessTokenRepository: OAuthAccessTokenRepository = {
  async revokeAccessToken(accessToken: OAuthAccessToken): Promise<void> {
    inMemoryDatabase.accessTokens[accessToken.token].expiresAt = new Date(0);
  },
  async getNewToken(client: OAuthClient, scopes: OAuthScope[], userId: string | undefined): Promise<OAuthAccessToken> {
    return {
      token: "new token",
      client,
      userId: userId,
      expiresAt: oneHourInFuture,
    } as OAuthAccessToken;
  },
  async persistNewAccessToken(accessToken: OAuthAccessToken): Promise<void> {
    inMemoryDatabase.accessTokens[accessToken.token] = accessToken;
  },
};

export const inMemoryRefreshTokenRepository: OAuthRefreshTokenRepository = {
  async revokeRefreshToken(refreshToken: OAuthRefreshToken): Promise<void> {
    inMemoryDatabase.refreshTokens[refreshToken.refreshToken].expiresAt = new Date(0);
  },
  async getRefreshToken(refreshTokenToken: string): Promise<OAuthRefreshToken> {
    return inMemoryDatabase.refreshTokens[refreshTokenToken];
  },
  async isRefreshTokenRevoked(refreshToken: OAuthRefreshToken): Promise<boolean> {
    return Date.now() > refreshToken.expiresAt.getTime();
  },
  async createRefreshTokenInstance(): Promise<OAuthRefreshToken | undefined> {
    return {
      refreshToken: "this-is-my-super-secret-refresh-token",
      expiresAt: oneHourInFuture,
    } as OAuthRefreshToken;
  },
  async persistRefreshToken(refreshToken: OAuthRefreshToken): Promise<void> {
    inMemoryDatabase.refreshTokens[refreshToken.refreshToken] = refreshToken;
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
    inMemoryDatabase.authCodes[authCode.token] = authCode;
  },
  async isAuthCodeRevoked(authCodeCode: string): Promise<boolean> {
    const authCode = await this.getAuthCodeByIdentifier(authCodeCode);
    return Date.now() > authCode.expiresAt.getTime();
  },
  async getAuthCodeByIdentifier(authCodeCode: string): Promise<OAuthAuthCode> {
    return inMemoryDatabase.authCodes[authCodeCode];
  },
  async revokeAuthCode(authCodeCode: string): Promise<void> {
    inMemoryDatabase.authCodes[authCodeCode].expiresAt = new Date(0);
  },
};

export const inMemoryUserRepository: OAuthUserRepository = {
  async getByUserIdentifier(userIdentifier: string): Promise<OAuthUser> {
    return inMemoryDatabase.users[userIdentifier];
  },
};
