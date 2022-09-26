import { OAuthToken } from "../entities/token.entity";
import { OAuthException } from "../exceptions/oauth.exception";
import { RequestInterface } from "../requests/request";
import { ResponseInterface } from "../responses/response";
import { DateInterval } from "../utils/date_interval";
import { AbstractGrant } from "./abstract/abstract.grant";

export class RefreshTokenGrant extends AbstractGrant {
  readonly identifier = "refresh_token";

  async respondToAccessTokenRequest(req: RequestInterface, accessTokenTTL: DateInterval): Promise<ResponseInterface> {
    const client = await this.validateClient(req);

    const oldToken = await this.validateOldRefreshToken(req, client.id);

    const user = oldToken.user;

    const scopes = await this.validateScopes(
      this.getRequestParameter(
        "scope",
        req,
        oldToken.scopes.map(s => s.name),
      ),
    );

    scopes.forEach(scope => {
      if (!oldToken.scopes.map(scope => scope.name).includes(scope.name)) {
        throw OAuthException.invalidScope(scope.name);
      }
    });

    await this.tokenRepository.revoke(oldToken);

    let newToken = await this.issueAccessToken(accessTokenTTL, client, user, scopes);

    newToken = await this.issueRefreshToken(newToken, client);

    const extraJwtFields = user ? await this.userRepository.extraAccessTokenFields?.(user) : undefined;

    return await this.makeBearerTokenResponse(client, newToken, scopes, extraJwtFields);
  }

  private async validateOldRefreshToken(request: RequestInterface, clientId: string): Promise<OAuthToken> {
    const encryptedRefreshToken = this.getRequestParameter("refresh_token", request);

    if (!encryptedRefreshToken) {
      throw OAuthException.invalidParameter("refresh_token");
    }

    let refreshTokenData: any;

    try {
      refreshTokenData = await this.decrypt(encryptedRefreshToken);
    } catch (e) {
      if (e instanceof Error && e.message === "invalid signature") {
        throw OAuthException.invalidParameter("refresh_token", "Cannot verify the refresh token");
      }
      throw OAuthException.invalidParameter("refresh_token", "Cannot decrypt the refresh token");
    }

    if (!refreshTokenData?.refresh_token_id) {
      throw OAuthException.invalidParameter("refresh_token", "Token missing");
    }

    if (refreshTokenData?.client_id !== clientId) {
      throw OAuthException.invalidParameter("refresh_token", "Token is not linked to client");
    }

    if (Date.now() / 1000 > refreshTokenData?.expire_time) {
      throw OAuthException.invalidParameter("refresh_token", "Token has expired");
    }

    const refreshToken = await this.tokenRepository.getByRefreshToken(refreshTokenData.refresh_token_id);

    if (await this.tokenRepository.isRefreshTokenRevoked(refreshToken)) {
      throw OAuthException.invalidParameter("refresh_token", "Token has been revoked");
    }

    return refreshToken;
  }
}
