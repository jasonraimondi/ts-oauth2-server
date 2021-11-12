import { OAuthAuthCode } from "../../src/entities/auth_code.entity";
import { OAuthClient } from "../../src/entities/client.entity";
import { OAuthDeviceUserCode } from "../../src/entities/device_user_code.entity";
import { OAuthScope } from "../../src/entities/scope.entity";
import { OAuthToken } from "../../src/entities/token.entity";
import { OAuthUser } from "../../src/entities/user.entity";
import { GrantIdentifier } from "../../src/grants/abstract/grant.interface";
import { OAuthTokenRepository } from "../../src/repositories/access_token.repository";
import { OAuthAuthCodeRepository } from "../../src/repositories/auth_code.repository";
import { OAuthClientRepository } from "../../src/repositories/client.repository";
import { OAuthDeviceUserCodeRepository } from "../../src/repositories/deviceuser_code.repository";
import { OAuthScopeRepository } from "../../src/repositories/scope.repository";
import { ExtraAccessTokenFields, OAuthUserRepository } from "../../src/repositories/user.repository";
import { DateInterval } from "../../src/utils/date_interval";
import { inMemoryDatabase } from "./database";

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
    _client: OAuthClient,
    _user_id?: string,
  ): Promise<OAuthScope[]> {
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
  // @todo
  async getByRefreshToken(refreshTokenToken: string): Promise<OAuthToken> {
    const token = Object.values(inMemoryDatabase.tokens).find(token => token.refreshToken === refreshTokenToken);
    if (!token) throw new Error("token not found");
    return token;
  },
  async isRefreshTokenRevoked(token: OAuthToken): Promise<boolean> {
    return Date.now() > (token.refreshTokenExpiresAt?.getTime() ?? 0);
  },
  async issueRefreshToken(token): Promise<OAuthToken> {
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

  async getUserByIdentifiers(identifier: string, client: OAuthClient): Promise<OAuthUser|undefined> {
    return this.getUserByCredentials(identifier, undefined, undefined, client);
  },

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
  async extraAccessTokenFields(user: OAuthUser): Promise<ExtraAccessTokenFields | undefined> {
    return {
      email: user.email,
    };
  },
};

export const inMemoryDeviceCodeRepository: OAuthDeviceUserCodeRepository = {

  async getByIdentifier(deviceCode: string): Promise<OAuthDeviceUserCode|undefined> {
    return inMemoryDatabase.deviceCodes[deviceCode];
  },

  async issueDeviceUserCode(_client: OAuthClient, scopes: OAuthScope[]): Promise<OAuthDeviceUserCode> {
    const nowString = `${Date.now()}`;
    const lastFiveDigits = nowString.substring(nowString.length - 5);
    const  deviceCode =`device-${Date.now()}`;
    const retval: OAuthDeviceUserCode = {
       deviceCode: deviceCode,
       userCode: lastFiveDigits,
       verificationUri: 'https://example.com/verifiy',
       verificationUriComplete: `https://example.com/verifiy&code=${lastFiveDigits}`,
       creationTime: new Date(),
       expiresIn: 1800,
       status: 'pending',
       scopes: scopes
    };
    inMemoryDatabase.deviceCodes[deviceCode] = retval;
    return retval;
  },

  async revoke(deviceCode: string): Promise<void> {
    delete inMemoryDatabase.deviceCodes[deviceCode];
  }

}
