import { OAuthToken } from "../../../src";
import OAuthScopeImp from "../entities/oauthScope";
import OAuthTokenImp from "../entities/oauthToken";

export default class OAuthTokenFactory {
  static from(token: OAuthToken): OAuthTokenImp {
    const newToken = new OAuthTokenImp();
    newToken.clientId = token.client.id;
    newToken.userId = token.user?.id;
    newToken.accessToken = token.accessToken;
    newToken.accessTokenExpiresAt = token.accessTokenExpiresAt;
    newToken.refreshToken = token.refreshToken;
    newToken.refreshTokenExpiresAt = token.refreshTokenExpiresAt;
    newToken.scopes = token.scopes as OAuthScopeImp[];
    return newToken;
  }
}
