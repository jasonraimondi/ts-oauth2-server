import { OAuthAuthCode } from "../../../../src/entities/auth_code.entity.js";
import { OAuthClient } from "../../../../src/entities/client.entity.js";
import { OAuthScope } from "../../../../src/entities/scope.entity.js";
import { OAuthToken } from "../../../../src/entities/token.entity.js";
import { OAuthUser } from "../../../../src/entities/user.entity.js";
import { GrantIdentifier } from "../../../../src/grants/abstract/grant.interface.js";
import { OAuthTokenRepository } from "../../../../src/repositories/access_token.repository.js";
import { OAuthAuthCodeRepository } from "../../../../src/repositories/auth_code.repository.js";
import { OAuthClientRepository } from "../../../../src/repositories/client.repository.js";
import { OAuthScopeRepository } from "../../../../src/repositories/scope.repository.js";
import { OAuthUserRepository } from "../../../../src/repositories/user.repository.js";
import { guardAgainstInvalidClientScopes } from "../../../../src/utils/scopes.js";
import { DateInterval } from "../../../../src/utils/date_interval.js";
import { inMemoryDatabase } from "./database.js";

const oneHourInFuture = new DateInterval("1h").getEndDate();

export const inMemoryClientRepository: OAuthClientRepository = {
  async getByIdentifier(clientId: string): Promise<OAuthClient> {
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
  async getAllByIdentifiers(scopeNames: string[]): Promise<OAuthScope[]> {
    return Object.values(inMemoryDatabase.scopes).filter(scope => scopeNames.includes(scope.name));
  },
  async finalize(
    scopes: OAuthScope[],
    _identifier: GrantIdentifier,
    client: OAuthClient,
    _user_id?: string,
  ): Promise<OAuthScope[]> {
    guardAgainstInvalidClientScopes(scopes, client);

    return scopes;
  },
};

export const inMemoryAccessTokenRepository: OAuthTokenRepository = {
  async revoke(accessToken: OAuthToken): Promise<void> {
    const token = inMemoryDatabase.tokens[accessToken.accessToken];
    token.accessTokenExpiresAt = new Date(0);
    token.refreshTokenExpiresAt = new Date(0);
    inMemoryDatabase.tokens[accessToken.accessToken] = token;
  },
  async issueToken(client: OAuthClient, _scopes: OAuthScope[], user: OAuthUser): Promise<OAuthToken> {
    return <OAuthToken>{
      accessToken: "new token",
      accessTokenExpiresAt: oneHourInFuture,
      client,
      user,
      scopes: [],
    };
  },
  async persist(accessToken: OAuthToken): Promise<void> {
    inMemoryDatabase.tokens[accessToken.accessToken] = accessToken;
  },
  async getByRefreshToken(refreshTokenToken: string): Promise<OAuthToken> {
    const token = Object.values(inMemoryDatabase.tokens).find(token => token.refreshToken === refreshTokenToken);
    if (!token) throw new Error("token not found");
    return token;
  },
  async getByAccessToken(accessToken: string): Promise<OAuthToken> {
    return inMemoryDatabase.tokens[accessToken];
  },
  async isRefreshTokenRevoked(token: OAuthToken): Promise<boolean> {
    return Date.now() > (token.refreshTokenExpiresAt?.getTime() ?? 0);
  },
  async issueRefreshToken(token: OAuthToken, _: OAuthClient): Promise<OAuthToken> {
    token.refreshToken = "refreshtokentoken";
    token.refreshTokenExpiresAt = new DateInterval("1h").getEndDate();
    inMemoryDatabase.tokens[token.accessToken] = token;
    return token;
  },
};

export const inMemoryAuthCodeRepository: OAuthAuthCodeRepository = {
  issueAuthCode(client: OAuthClient, user: OAuthUser | undefined, _scopes: OAuthScope[]): OAuthAuthCode {
    return {
      code: "my-super-secret-auth-code",
      user,
      client,
      redirectUri: "",
      codeChallenge: undefined,
      codeChallengeMethod: undefined,
      expiresAt: oneHourInFuture,
      scopes: [],
    };
  },
  async persist(authCode: OAuthAuthCode): Promise<void> {
    inMemoryDatabase.authCodes[authCode.code] = authCode;
  },
  async isRevoked(authCodeCode: string): Promise<boolean> {
    const authCode = await this.getByIdentifier(authCodeCode);
    return Date.now() > authCode.expiresAt.getTime();
  },
  async getByIdentifier(authCodeCode: string): Promise<OAuthAuthCode> {
    return inMemoryDatabase.authCodes[authCodeCode];
  },
  async revoke(authCodeCode: string): Promise<void> {
    inMemoryDatabase.authCodes[authCodeCode].expiresAt = new Date(0);
  },
};

export const inMemoryUserRepository: OAuthUserRepository = {
  async getUserByCredentials(
    identifier: string,
    password?: string,
    _grantType?: GrantIdentifier,
    _client?: OAuthClient,
  ): Promise<OAuthUser | undefined> {
    const user = inMemoryDatabase.users[identifier];
    if (user?.password !== password) return;
    return user;
  },
};
