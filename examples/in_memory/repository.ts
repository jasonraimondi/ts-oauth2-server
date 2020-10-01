import { DateInterval } from "~/authorization_server";
import { OAuthAuthCode } from "~/entities/auth_code.entity";
import { OAuthClient } from "~/entities/client.entity";
import { OAuthScope } from "~/entities/scope.entity";
import { OAuthAccessToken } from "~/entities/token.entity";
import { OAuthUser } from "~/entities/user.entity";
import { GrantIdentifier } from "~/grants/abstract/grant.interface";
import { OAuthAccessTokenRepository } from "~/repositories/access_token.repository";
import { OAuthAuthCodeRepository } from "~/repositories/auth_code.repository";
import { OAuthClientRepository } from "~/repositories/client.repository";
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
  async revokeToken(accessToken: OAuthAccessToken): Promise<void> {
    const token = inMemoryDatabase.tokens[accessToken.accessToken];
    token.accessTokenExpiresAt = new Date(0);
    token.refreshTokenExpiresAt = new Date(0);
    inMemoryDatabase.tokens[accessToken.accessToken] = token;
  },
  async getNewToken(client: OAuthClient, scopes: OAuthScope[], user: OAuthUser): Promise<OAuthAccessToken> {
    return <OAuthAccessToken>{
      accessToken: "new token",
      accessTokenExpiresAt: oneHourInFuture,
      client,
      user,
      scopes: [],
    };
  },
  async persistNewToken(accessToken: OAuthAccessToken): Promise<void> {
    inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;
  },
  // @todo
  async getRefreshToken(refreshTokenToken: string): Promise<OAuthAccessToken> {
    const token = Object.values(inMemoryDatabase.tokens).find((token) => token.refreshToken === refreshTokenToken);
    if (!token) throw new Error("token not found");
    return token;
  },
  async isRefreshTokenRevoked(token: OAuthAccessToken): Promise<boolean> {
    return Date.now() > (token.refreshTokenExpiresAt?.getTime() ?? 0);
  },
  async createRefreshTokenInstance(): Promise<[string, Date]> {
    return ["this-is-my-super-secret-refresh-token", oneHourInFuture];
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
  async getByUserEntityByCredentials(
    identifier: string,
    password?: string,
    grantType?: GrantIdentifier,
    client?: OAuthClient,
  ): Promise<OAuthUser | undefined> {
    const user = inMemoryDatabase.users[identifier];
    if (user?.password !== password) return;
    return user;
  },
};
