import { getRepository } from "typeorm";
import { OAuthClient, OAuthScope, OAuthToken, OAuthTokenRepository, OAuthUser } from "../../../src";
import OAuthTokenImp from "../entities/oauthToken";
import OAuthUserImp from "../entities/oauthUser";
import OAuthTokenFactory from "../factories/oauthTokenFactory";

export const tokenRepository: OAuthTokenRepository = {
  // An async call that should return an OAuthToken that has not been
  // persisted to storage yet.
  async issueToken(client: OAuthClient, scopes: OAuthScope[], user?: OAuthUser): Promise<OAuthToken> {
    if (!user || !(user instanceof OAuthUserImp)) throw "Need valid User to issue Oauth2 Token";
    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + parseInt(process.env.JWT_EXPIRE as string) || 50000);
    return {
      accessToken: "fresh-token",
      accessTokenExpiresAt: expiration,
      client: client,
      scopes: scopes,
      user: user,
    };
  },
  // Add a refresh token
  async issueRefreshToken(accessToken: OAuthToken): Promise<OAuthToken> {
    return accessToken;
  },
  // An async call that should persist an OAuthToken into your storage.
  async persist(accessToken: OAuthToken): Promise<void> {
    const tokenRepo = getRepository(OAuthTokenImp, process.env.NODE_ENV);
    const newToken = OAuthTokenFactory.from(accessToken);
    await tokenRepo.save(newToken);
    return;
  },
  // This async method is called when a refresh token is used to reissue
  // an access token. The original access token is revoked a new access
  // token is issued.
  async revoke(accessTokenToken: OAuthToken): Promise<void> {
    const tokenRepo = getRepository(OAuthTokenImp, process.env.NODE_ENV);
    await tokenRepo.delete({ accessToken: accessTokenToken.accessToken });
  },
  // This async method is called when an access token is validated by the
  // authorization server. Return `true` if the access token has been
  // manually revoked. If the token is still valid return `false`
  async isRefreshTokenRevoked(refreshToken: OAuthToken): Promise<boolean> {
    return Date.now() > (refreshToken.refreshTokenExpiresAt?.getTime() ?? 0);
  },
  // Fetch refresh token entity from storage by refresh token
  async getByRefreshToken(refreshTokenToken: string): Promise<OAuthToken> {
    const tokenRepo = getRepository(OAuthTokenImp, process.env.NODE_ENV);
    const token = await tokenRepo.findOne(
      { refreshToken: refreshTokenToken },
      { relations: ["client", "scopes", "user"] },
    );
    return token as OAuthToken;
  },
};
